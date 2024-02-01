require("dotenv").config();

var cors = require('cors')
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const connectToDatabase = require('./dbConnection');
mongoose.set('strictQuery', false);
const app = express();
const port = process.env.PORT || 3000;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Define o diretório onde os arquivos serão temporariamente armazenados
const bcrypt = require('bcrypt');
import { PDFDocument } from 'pdf-lib'

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
  
  cidade: String,
  dataHora: Date,
});

// Model do usuário
const Usuario = mongoose.model('Usuario', {
  email: String,
  senha: String, // A senha será armazenada criptografada
});

// Configura o middleware para lidar com solicitações JSON

app.use(cors(corsOptions));
app.use(express.json());
app.use(upload.single('imagem')); // Use o middleware para lidar com o upload de um único arquivo com o campo 'imagem'

// Função para reconhecer texto em uma imagem usando a API
async function recognizeTextInImage(imageFile) { // Agora recebe um arquivo de imagem

  const options = {
    method: 'POST',
    url: apiUrl,
    headers: {
      'content-type': apiContent,
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    data: {
      imageFile: imageFile, // Passa o arquivo de imagem
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Erro ao chamar a API de reconhecimento de texto:', error);
    throw error;
  }
}

// Rota POST para '/cadastroPlaca'
app.post('/cadastroPlaca', async (req, res) => { 
  try {
    const imageFile = req.file; // Substitua pela URL da imagem real
    //const imageUrl = 'https://th.bing.com/th/id/R.b8f27a613166653e26da4536a2493b3a?rik=JNhQ5%2fw%2bt3KgtA&riu=http%3a%2f%2fstatic.tumblr.com%2f612e3305467fbdb1a3db8dc7e07cf396%2flwmhni0%2fJZHnioaul%2ftumblr_static_couxe5wdpts0044csgookw88.jpg&ehk=Y7BkBZvG5g%2fFXmB8RGsL6FhYg%2bi%2ffL8sKAeO2GCMmxk%3d&risl=&pid=ImgRaw&r=0'; // Substitua pela URL da imagem real
    
    // O texto reconhecido está em result.text
    const { cidade } = req.body;
    const dataHora = new Date();

    if (!imageFile) {
      return res.status(400).send('Nenhum arquivo de imagem foi enviado.');
    }

    // Reconhecimento de texto na imagem usando a função
    const result = await recognizeTextInImage(imageFile); // Passa a URL de imagem

    console.log(result);

    if (!result || !result.text) {
      return res.status(400).send('Não foi possível reconhecer o texto na imagem.');
    }

    // Salvar no MongoDB
    const placa = new Placa({
      numero: result.text,
      cidade: cidade,
      dataHora: dataHora,
      imagem:imageFile,
    });

    await placa.save();

    res.status(201).send('Placa cadastrada com sucesso.');
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
    console.log('placas.length:', placas.length);

    if (placas.length === 0) {
      return res.status(404).send('Nenhum registro encontrado para a cidade especificada.');
    }

    const fileName = `relatorio_${cidade}.pdf`;

    // Chamar a função createPDF() para criar o PDF e aguardar a Promise
    const pdfBuffer = await createPDF(placas, fileName);
    console.log('pdfbuffer.length:', pdfBuffer.length);

    // Verificar se o buffer do PDF está vazio ou inválido
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).send('Erro ao gerar o relatório: PDF vazio.');
    }    

    // Enviar o PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Enviar o buffer do PDF como resposta
    res.end(pdfBuffer);
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
async function createPDF(placas, fileName) {
  
  const fs = require('fs');
  const PDFDocument = require('pdfkit');
  const blobStream = require('blob-stream');
  //const MemoryStream = require('memorystream'); // Usar MemoryStream para armazenar o PDF em memória

  const doc = new PDFDocument();
  const tmpFilePath = `./uploads/${fileName}`;
  
  const stream = doc.pipe(blobStream()); // Redirecionar a saída do PDF para o arquivo temporário

  placas.forEach((placa, index) => {

    
    doc.text(`Registro ${index + 1}:`);
    doc.text(`Número da Placa: ${placa.numero}`);
    doc.text(`Cidade: ${placa.cidade}`);
    doc.text(`Data e Hora: ${placa.dataHora}`);

    doc.moveDown();
  });

  doc.end();
  
  // Manipule o evento 'finish' para retornar o conteúdo do arquivo temporário como um buffer
  return stream.on('finish', function(){
    const url = stream.toBlobURL(tmpFilePath);
  });
}

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
