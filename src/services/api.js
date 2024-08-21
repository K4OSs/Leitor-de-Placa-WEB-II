require("dotenv").config();

var cors = require('cors')
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const connectToDatabase = require('./dbConnection');
mongoose.set('strictQuery', true);
const app = express();
const port = process.env.PORT || 3000;

const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' }); // Define o diretório onde os arquivos serão temporariamente armazenados
const bcrypt = require('bcrypt');

const apiUrl = process.env.API_URL;
const apiContent = process.env.API_CONTENT_TYPE;
const apiKey = process.env.API_KEY;
const apiHost = process.env.API_HOST;

const corsOptions = {
  origin: 'http://localhost:3001', // Altere para a origem permitida no seu caso
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Habilita o uso de credenciais, se necessário
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
  email: String,
  senha: String, // A senha será armazenada criptografada
});

// Configura o middleware para lidar com solicitações JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());

// Função para reconhecer texto em uma imagem usando a API
async function recognizeTextInImage(imageFile) { // Agora recebe um arquivo de imagem

  const imageBase64 = fs.readFileSync(imageFile.path, { encoding: 'base64' });
  const imageData = `data:image/png;base64,${imageBase64}`; // Formata corretamente

  const options = {
    method: 'POST',
    url: apiUrl,
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

// Rota POST para '/cadastroPlaca'
app.post('/cadastroPlaca', upload.single('imagem'), async (req, res) => { 
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
app.get('/consulta/:placa', async (req, res) => {
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

// Rota GET para '/relatorio/cidade/:cidade'
app.get('/relatorio/cidade/:cidade', async (req, res) => {
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
  try {
    const { email, senha } = req.body;

    // Verifica se o email já está cadastrado
    const existingUser = await Usuario.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).send('Este email já está cadastrado.');
    }

    // Criptografa a senha antes de armazenar no banco de dados
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Cria um novo usuário
    const novoUsuario = new Usuario({
      email,
      senha: hashedPassword,
    });

    // Salva o novo usuário no banco de dados
    await novoUsuario.save();

    res.status(201).send('Usuário cadastrado com sucesso.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao cadastrar o usuário.');
  }
});

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