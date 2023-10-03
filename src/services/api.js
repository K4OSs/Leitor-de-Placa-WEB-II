require("dotenv").config();

var cors = require('cors')
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const connectToDatabase = require('./dbConnection');
mongoose.set('strictQuery', false);

const app = express();
const port = process.env.PORT || 3000;


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



// Configura o middleware para lidar com solicitações JSON

app.use(cors(corsOptions));
app.use(express.json());

// Função para reconhecer texto em uma imagem usando a API
async function recognizeTextInImage(imageUrl) { // Agora recebe uma URL de imagem

  const options = {
    method: 'POST',
    url: apiUrl,
    headers: {
      'content-type': apiContent,
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    data: {
      imageUrl: imageUrl, // Passa a URL de imagem
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
    //const imageUrl = 'https://photos.enjoei.com.br/placa-de-carro-original-detran-era-do-meu-carro/1200xN/czM6Ly9waG90b3MuZW5qb2VpLmNvbS5ici9wcm9kdWN0cy8xMTc0NjE4Mi9hZTFkZDIzZDVlYTQxYWVlMTM4YzY0ZGIzNzhiZWE0My5qcGc'; // Substitua pela URL da imagem real
    const imageUrl = 'https://th.bing.com/th/id/R.b8f27a613166653e26da4536a2493b3a?rik=JNhQ5%2fw%2bt3KgtA&riu=http%3a%2f%2fstatic.tumblr.com%2f612e3305467fbdb1a3db8dc7e07cf396%2flwmhni0%2fJZHnioaul%2ftumblr_static_couxe5wdpts0044csgookw88.jpg&ehk=Y7BkBZvG5g%2fFXmB8RGsL6FhYg%2bi%2ffL8sKAeO2GCMmxk%3d&risl=&pid=ImgRaw&r=0'; // Substitua pela URL da imagem real

    // Reconhecimento de texto na imagem usando a função
    const result = await recognizeTextInImage(imageUrl); // Passa a URL de imagem

    if (!result || !result.text) {
      return res.status(400).send('Não foi possível reconhecer o texto na imagem.');
    }

    // O texto reconhecido está em result.text
    const { cidade } = req.body;
    const dataHora = new Date();

    // Salvar no MongoDB
    const placa = new Placa({
      numero: result.text,
      cidade: cidade,
      dataHora: dataHora,
    });

    await placa.save();

    res.status(201).send('Placa cadastrada com sucesso.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao cadastrar a placa.');
  }
});


// Rota GET para '/relatorio/cidade/:cidade'
app.get('/relatorio/cidade/:cidade', async (req, res) => {
  const { cidade } = req.params;

  try {
    const placas = await Placa.find({ cidade }).exec();

    if (placas.length === 0) {
      return res.status(404).send('Nenhum registro encontrado para a cidade especificada.');
    }

    const fileName = `relatorio_${cidade}.pdf`;

    // Chamar a função createPDF() e obter o caminho do PDF salvo
    const pdfPath = createPDF(placas, fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Enviar o PDF como resposta
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao gerar o relatório.');
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

// Função para criar um PDF a partir dos registros de placa
function createPDF(placas, fileName) {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');

  const doc = new PDFDocument();
  const pdfPath = `../pdfs/${fileName}`; // Caminho onde o PDF será salvo

  placas.forEach((placa, index) => {
    doc.text(`Registro ${index + 1}:`);
    doc.text(`Número da Placa: ${placa.numero}`);
    doc.text(`Cidade: ${placa.cidade}`);
    doc.text(`Data e Hora: ${placa.dataHora}`);
    doc.moveDown();
  });

  doc.pipe(fs.createWriteStream(pdfPath)); // Salvar o PDF no sistema de arquivos
  doc.end();

  return pdfPath; // Retornar o caminho do PDF salvo
}


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
