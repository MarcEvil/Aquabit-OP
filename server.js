const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir tu HTML, CSS y JS
app.use('/uploads', express.static('uploads')); // Para poder ver las fotos subidas

// --- CONFIGURACIÓN DE STORAGE (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Guardamos el archivo con un nombre único: timestamp + nombre original
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- CONEXIÓN A BASE DE DATOS (SEQUELIZE) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Vital para conectar con Supabase desde afuera
        }
    },
    logging: false // Para no llenar la consola de logs de SQL
});

// --- DEFINICIÓN DEL MODELO ---
const Registro = sequelize.define('Registro', {
    tipo: {
        type: DataTypes.STRING,
        allowNull: false // 'cortes' o 'reposiciones'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fotos: {
        type: DataTypes.JSON, // Guardaremos los nombres de los archivos como un array
        allowNull: false
    }
});

// --- INICIALIZACIÓN DE LA APP ---
async function startApp() {
    try {
        // Autenticar y Sincronizar Base de Datos
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa con Supabase (Aquabit-DB).');

        await sequelize.sync(); // Crea la tabla si no existe
        console.log('✅ Modelos sincronizados correctamente.');

        // --- RUTAS ---

        // Ruta para recibir los datos y las fotos
        app.post('/api/upload', upload.array('fotos', 3), async (req, res) => {
            try {
                const { tipo, observaciones } = req.body;

                // Extraemos solo los nombres de los archivos subidos
                const nombresFotos = req.files.map(file => file.filename);

                // Validación simple de negocio
                if (tipo === 'cortes' && nombresFotos.length < 3) {
                    return res.status(400).json({ error: 'Se requieren 3 fotos para cortes.' });
                }

                // Guardar en la base de datos
                const nuevoRegistro = await Registro.create({
                    tipo: tipo,
                    observaciones: observaciones,
                    fotos: nombresFotos
                });

                console.log('📝 Nuevo registro guardado:', nuevoRegistro.id);
                res.status(201).json({ message: 'Registro exitoso', data: nuevoRegistro });

            } catch (error) {
                console.error('❌ Error al procesar subida:', error);
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        });

        // Iniciar el servidor
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 AquaBit OP corriendo en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ No se pudo iniciar la aplicación:', error);
    }
}

startApp();
