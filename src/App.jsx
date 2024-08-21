
import { useState } from 'react';
import {FiSearch} from 'react-icons/fi';
import './styles.css';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import './styles/react-tabs.css'; // Importe o estilo padrão da biblioteca

import axios from 'axios';


export default function App() {
    

    const [input, setInput] = useState('')
    const [placa, setPlaca] = useState({})
//    const [relatorio, setRelatorio] = useState(null)

    async function handleSearchPlaca(){
        console.log(input);
        if(input === ''){
            alert('Preencha o número da placa')
            return;
        }

        try{
            const response = await axios({
                method:'get',
                url:`http://localhost:3000/consulta/${input}`
            });

            console.log(response)
            setPlaca(response.data[0])
            setInput('')

        }catch(error){

            if(error.response.status === 404){
                alert('Placa não encontrada no banco de dados')
            }else{
                alert('Erro ao buscar a placa');   
            }            
            
            setInput('')
            console.log(error);
        }
    }

    async function gerarRelatorio(){
        console.log(input);
        if(input === ''){
            alert('Preencha o nome da cidade')
            return;
        }

        try{
            const response = await axios({
                method:'get',
                url:`http://localhost:3000/relatorio/cidade/${input}`,
                responseType: 'blob',
            });

            // Cria um URl temporário para o arquivo PDF
            const url = window.URL.createObjectURL(new Blob([response.data]));

            // Cria um link de download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatório_${input}.pdf`);
            document.body.appendChild(link);

            // Simular um clique no link para iniciar o download
            link.click();
            
            // Limpar o URL temporário
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setInput('');

        }catch(error){
            if(error.response && error.response.status === 404){
                alert('Cidade não encontrada no banco de dados')
            }else{
                alert('Erro ao buscar a cidade');   
            }            
            
            setInput('')
            console.log(error);
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

                {/* Conteúdo das abas */}
                <TabPanel>
                    <div>
                        {/* Conteúdo da Aba 1 */}
                        <h1 className='title'>Buscador de placa</h1>

                        <div className='containerInput'>
                            <input
                            type='text'
                            placeholder='Digite o número da placa'
                            value={input}
                            onChange={(e) => setInput(e.target.value) }
                            />

                            <button className='buttonSearch' onClick={handleSearchPlaca}>
                                <FiSearch size={25} color='#FFF'/>
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
                        {/* Conteúdo da Aba 2 */}
                        <h1 className='title'>Relatório PDF</h1>

                        <div className='containerInput'>
                            <input
                            type='text'
                            placeholder='Digite o nome da cidade'
                            value={input}
                            onChange={(e) => setInput(e.target.value) }
                            />
                        
                            <button className='buttonSearch' onClick={gerarRelatorio}>
                                <FiSearch size={25} color='#FFF'/>
                            </button>
                        </div>
                    </div>
                </TabPanel>

                <TabPanel>
                    <div>
                        {/* Conteúdo da Aba 3 */}
                        <p>Conteúdo da Aba 3</p>
                    </div>
                </TabPanel>

            </Tabs>

        </div>

    );
}