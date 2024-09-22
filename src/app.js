require("dotenv").config();

var cors = require('cors')
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');  // Para servir arquivos estáticos
const connectToDatabase = require('./dbConnection');
mongoose.set('strictQuery', true);
const app = express();
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' }); // Define o diretório onde os arquivos serão temporariamente armazenados
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const port = process.env.PORT;
const secretKey = process.env.TOKEN_KEY; // Defina uma chave secreta no arquivo .env
const ocrApiUrl = process.env.OCR_API_URL;
const apiContent = process.env.API_CONTENT_TYPE;
const apiKey = process.env.API_KEY;
const apiHost = process.env.API_HOST;
const frontendUrl = process.env.FRONTEND_URL

const corsOptions = {
  origin: [frontendUrl, `http://localhost:3000`],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: false, // Habilita o uso de credenciais, se necessário
  optionsSuccessStatus: 204, // Retorna um status 204 para as solicitações OPTIONS
};

connectToDatabase();

// Model do registro de placa
const Placa = mongoose.model('Placa', {
  numero: String,
  estado: String,
  cidade: String,
  dataHora: Date,
});

// Model do usuário
const Usuario = mongoose.model('Usuario', {
  nome: String,
  email: { type: String, unique: true },  // Certifique-se de que o campo "email" seja único
  senha: String, // A senha será armazenada criptografada
});

// Servindo arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, '../public')));  // Certifique-se de apontar para o diretório correto

// Configura o middleware para lidar com solicitações JSON
app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());

// Verificar se o token JWT é válido
const verificarJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Obtém o token do cabeçalho Authorization
  if (!token) {
      return res.status(401).json({ logado: false, mensagem: 'Token não foi enviado.' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
          return res.status(401).json({ logado: false, mensagem: 'Falha na autenticação' });
      }
      req.userId = decoded.id; // Armazena o ID do usuário no request
      next();
  });
};

// Rota POST para '/cadastroPlaca'
app.post('/cadastroPlaca', verificarJWT, upload.single('imagem'), async (req, res) => { 
  try {
    const imageFile = req.file;

    if (!req.file) {
      return res.status(400).send('Nenhum arquivo de imagem foi enviado.');
    }

    // Reconhecimento de texto na imagem usando a API de OCR
    const result = await recognizeTextInImage(imageFile);

    // Apagar o arquivo temporário após o uso
    fs.unlinkSync(imageFile.path);

    if (!result || !result.text) {
      return res.status(400).send('Não foi possível reconhecer o texto na imagem.');
    }

    // Processar o texto reconhecido
    const infoPlaca = processarTexto(result.text);

    console.log('Texto reconhecido:', result.text);
    console.log('Resultado do regex:', infoPlaca);

    if (infoPlaca) {
      const dataHora = new Date();

      // Salvar informações da placa no banco (sem armazenar a imagem)
      const placa = new Placa({
        numero: infoPlaca.numeroPlaca,
        cidade: infoPlaca.cidade || 'Desconhecida',
        estado: infoPlaca.estado,
        dataHora: dataHora,
      });

      await placa.save();

      res.status(201).send('Placa cadastrada com sucesso.');
    } else {
      res.status(400).send('O texto reconhecido não está no formato esperado.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao cadastrar a placa.');
  }
});

// Rota GET para '/consulta/:placa'
app.get('/consulta/:placa', verificarJWT, async (req, res) => {
  const { placa } = req.params;

  try {
    const placas = await Placa.find({ numero: placa }).exec();

    if (placas.length === 0) {
      return res.status(404).send('Placa não encontrada no banco de dados.');
    }

    res.json(placas);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao consultar a placa.');
  }
});

// Rota GET para '/relatorio/:cidade'
app.get('/relatorio/:cidade', verificarJWT, async (req, res) => {
  const { cidade } = req.params;

  try {
    const placas = await Placa.find({ cidade }).exec();
    //console.log('placas.length:', placas.length);

    if (placas.length === 0) {
      return res.status(404).send('Nenhum registro encontrado para a cidade especificada.');
    }

    const fileName = `relatorio_${cidade}.pdf`;

    // Chamar a função createPDF() para criar o PDF
    const pdfBuffer = await createPDF(placas);

    // // Salvar o PDF em um arquivo (apenas para depuração)
    // const fs = require('fs');
    // fs.writeFileSync(fileName, pdfBuffer);
    // console.log(`PDF salvo em ${fileName}`);
  

    // Enviar o PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer); // Enviar o buffer do PDF como resposta

  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao gerar o relatório.');
    
  }
});

// Rota POST para '/cadastrarUsuario'
app.post('/cadastrarUsuario', async (req, res) => {
  //console.log('Requisição recebida:', req.body);  // Verifica o corpo da requisição no servidor
  try {
    const { nome, email, senha } = req.body;

    // Verifica se o email foi fornecido
    if (!email) {
      return res.status(400).json({ mensagem: 'Email é obrigatório.' });
    }

    // Verifica se o email tem um formato válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ mensagem: 'Email inválido.' });
    }

    // Verificar se o email já está em uso
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
        return res.status(400).json({ mensagem: 'Email já cadastrado.' });
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);
    console.log('Senha criptografada:', senhaCriptografada); // Verifique se a senha está sendo criptografada corretamente

    // Cria um novo usuário
    const novoUsuario = new Usuario({
      nome,
      email,
      senha: senhaCriptografada,
    });

    // Salva o novo usuário no banco de dados
    await novoUsuario.save();

    res.json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao cadastrar o usuário.' });
  }
});

// Rota GET para '/videoTutorial'
app.get('/videoTutorial', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', 'tutorial.mp4'); // Defina o caminho para o vídeo
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Existe um cabeçalho Range, enviamos uma parte do vídeo
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, headers);
    file.pipe(res);
  } else {
    // Sem cabeçalho Range, enviamos o arquivo completo
    const headers = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(200, headers);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Rota de login que valida o email e senha e retorna um token JWT
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await Usuario.findOne({ email }).exec();
  if (!usuario) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
  }

  const senhaValida = await bcrypt.compareSync(senha, usuario.senha);
  if (!senhaValida) {
      return res.status(401).json({ mensagem: 'Senha incorreta.' });
  }

  const token = jwt.sign({ id: usuario.id }, process.env.TOKEN_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Função para reconhecer texto em uma imagem usando a API
async function recognizeTextInImage(imageFile) { // Agora recebe um arquivo de imagem

  const imageBase64 = fs.readFileSync(imageFile.path, { encoding: 'base64' });
  const imageData = `data:image/png;base64,${imageBase64}`; // Formata corretamente

  const options = {
    method: 'POST',
    url: ocrApiUrl,
    headers: {
      'content-type': apiContent,
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    data: {
      imageUrl: imageData, // Envia a string base64 no campo "imageUrl"
    },
  };

  try {
    const response = await axios.request(options);
    console.log("Resposta da API de OCR:", response.data); // Log da resposta para verificação
    return response.data;
  } catch (error) {
    console.error('Erro ao chamar a API de reconhecimento de texto:', error);
    throw error;
  }
}

// Função para processar e separar o texto na imagem
function processarTexto(texto) {
  // Remove quebras de linha e espaços extras
  const cleanedText = texto.replace(/\n/g, ' ').trim();
  const regexPlaca = /([A-Z]{2})\s+([\w\s]+?)\s+([A-Z]{3}-\d{4})/;
  const match = cleanedText.match(regexPlaca);

  if (match) {
    const estado = match[1];
    const cidade = match[2].trim();
    const numeroPlaca = match[3].replace('-', ''); // Remove hífen se necessário

    return { estado, cidade, numeroPlaca };
  } else {
    return null;
  }
}

// Função para criar um PDF a partir dos registros de placa
async function createPDF(placas) {

  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument();

    doc.on('data', (chunk) => {
      buffers.push(chunk);
    });

    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    placas.forEach((placa, index) => {
      //console.log(`Adicionando informações para Registro ${index + 1}`);
      doc.text(`Registro ${index + 1}:`);
      doc.text(`Número da Placa: ${placa.numero}`);
      doc.text(`Cidade: ${placa.cidade}`);
      doc.text(`Data e Hora: ${placa.dataHora}`);

      doc.moveDown();
    });

    doc.end();
  });
}

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

module.exports = app