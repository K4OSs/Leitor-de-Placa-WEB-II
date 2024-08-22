import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import './styles.css';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import './styles/react-tabs.css'; // Importe o estilo padrão da biblioteca
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function App() {
    const [input, setInput] = useState('');
    const [placa, setPlaca] = useState({});
    const [imagem, setImagem] = useState(null);
    const [mensagem, setMensagem] = useState('');

    async function handleSearchPlaca() {
        console.log(input);
        if (input === '') {
            alert('Preencha o número da placa');
            return;
        }

        try {
            const response = await axios({
                method: 'get',
                url: `${apiUrl}/consulta/${input}`,
            });

            console.log(response);
            setPlaca(response.data[0]);
            setInput('');
        } catch (error) {
            if (error.response.status === 404) {
                alert('Placa não encontrada no banco de dados');
            } else {
                alert('Erro ao buscar a placa');
            }

            setInput('');
            console.log(error);
        }
    }

    async function gerarRelatorio() {
        console.log(input);
        if (input === '') {
            alert('Preencha o nome da cidade');
            return;
        }

        try {
            const response = await axios({
                method: 'get',
                url: `${apiUrl}/relatorio/cidade/${input}`,
                responseType: 'blob',
                timeout: 10000,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatório_${input}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setInput('');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                alert('Cidade não encontrada no banco de dados');
            } else {
                alert('Erro ao buscar a cidade');
            }

            setInput('');
            console.log(error);
        }
    }

    async function handleImageUpload(e) {
        e.preventDefault();

        if (!imagem) {
            alert('Selecione uma imagem antes de enviar');
            return;
        }

        const formData = new FormData();
        formData.append('imagem', imagem);

        try {
            const response = await axios.post(`${apiUrl}/cadastroPlaca`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setMensagem(response.data);
            setImagem(null); // Limpar a imagem após o envio bem-sucedido
        } catch (error) {
            console.error('Erro ao enviar a imagem:', error);
            setMensagem('Erro ao cadastrar a placa. Tente novamente.');
        }
    }

    return (
        <div className='container'>
            <Tabs>
                <TabList>
                    <Tab>Aba 1</Tab>
                    <Tab>Aba 2</Tab>
                    <Tab>Aba 3</Tab>
                </TabList>

                <TabPanel>
                    <div>
                        <h1 className='title'>Buscador de placa</h1>
                        <div className='containerInput'>
                            <input
                                type='text'
                                placeholder='Digite o número da placa'
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button className='buttonSearch' onClick={handleSearchPlaca}>
                                <FiSearch size={25} color='#FFF' />
                            </button>
                        </div>

                        {Object.keys(placa).length > 0 && (
                            <main className='main'>
                                <h2>Placa encontrada: {placa.numero}</h2>
                                <span>Cidade: {placa.cidade}</span>
                                <span>Data/Hora: {placa.dataHora}</span>
                            </main>
                        )}
                    </div>
                </TabPanel>

                <TabPanel>
                    <div>
                        <h1 className='title'>Relatório PDF</h1>
                        <div className='containerInput'>
                            <input
                                type='text'
                                placeholder='Digite o nome da cidade'
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button className='buttonSearch' onClick={gerarRelatorio}>
                                <FiSearch size={25} color='#FFF' />
                            </button>
                        </div>
                    </div>
                </TabPanel>

                <TabPanel>
                    <div>
                        <h1 className='title'>Upload de Imagem</h1>

                        <form onSubmit={handleImageUpload} className='uploadForm'>
                            <input
                                type='file'
                                onChange={(e) => setImagem(e.target.files[0])}
                                accept='image/*'
                            />
                            <button type='submit'>Enviar Imagem</button>
                        </form>

                        {mensagem && <p>{mensagem}</p>}
                    </div>
                </TabPanel>
            </Tabs>
        </div>
    );
}
