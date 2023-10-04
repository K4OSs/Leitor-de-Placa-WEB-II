
import { useState } from 'react';
import {FiSearch} from 'react-icons/fi';
import './styles.css';

import axios from 'axios';


export default function App() {
    

    const [input, setInput] = useState('')
    const [placa, setPlaca] = useState({})

    async function handleSearch(){
        console.log(input);
        if(input === ''){
            alert('Preencha o número da placa')
            return;
        }

        try{
            const response = await axios({
                method:'get',
                url:'http://localhost:3000/consulta/'+ input
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

    return (
        <>
            <div className='container'>
                <h1 className='title'>Buscador de placa</h1>

                <div className='containerInput'>
                    <input
                    type='text'
                    placeholder='Digite o número da placa'
                    value={input}
                    onChange={(e) => setInput(e.target.value) }
                    />

                    <button className='buttonSearch' onClick={handleSearch}>
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
        </>
    );
}

