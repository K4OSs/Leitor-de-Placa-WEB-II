//Conexão com o banco de dados MongoDB
const dotenv = require('dotenv');
const mongoose = require('mongoose')

dotenv.config();

const url = process.env.DB_URL;

const connectionParams={
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

const connectToDatabase = async () => {
    try {
        const connection = await mongoose.connect(url, connectionParams);
        console.log('Conectado ao banco de dados');
        return connection;
    } catch (err) {
        console.error(`Erro ao conectar ao banco de dados. \n${err}`);
    }
};
  
module.exports = connectToDatabase;