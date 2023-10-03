
import { useState } from 'react';
import {FiSearch} from 'react-icons/fi';
import './styles.css';

import axios from 'axios';
import { CorsOptions } from 'cors';


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
                url:'http://localhost:3333/consulta/'+ input
            });
            console.log(response)
            setPlaca(response.data)

        }catch(error){
            alert('Erro ao buscar a placa');
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
                    placeholder='Digite o nome da cidade'
                    value={input}
                    onChange={(e) => setInput(e.target.value) }
                    />

                    <button className='buttonSearch' onClick={handleSearch}>
                        <FiSearch size={25} color='#FFF'/>
                    </button>
                </div>

                <main className='main'>
                    <h2>Número da placa: FGH2643</h2>

                    <span>Cidade: Juazeiro</span>
                    <span>Data/Hora: 12:23</span>
                </main>

            </div>
        </>
    );
}

