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
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// --- CONFIGURACIÓN DE STORAGE (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- CONEXIÓN A BASE DE DATOS (SEQUELIZE) ---
// Usamos process.env.DATABASE_URL que configuramos en el panel de Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Vital para certificados de Supabase/Render
        },
        // Esto ayuda a evitar errores de protocolo en conexiones persistentes
        prepareThreshold: 0
    },
    // El Pool mantiene conexiones abiertas para evitar el "Connection terminated unexpectedly"
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: false
});

// --- DEFINICIÓN DEL MODELO ---
const Registro = sequelize.define('Registro', {
    tipo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fotos: {
        type: DataTypes.JSON,
        allowNull: false
    }
});

// --- INICIALIZACIÓN DE LA APP ---
async function startApp() {
    try {
        // Autenticar y Sincronizar Base de Datos
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa con Supabase (Aquabit-DB).');

        await sequelize.sync();
        console.log('✅ Modelos sincronizados correctamente.');

        // --- RUTAS ---

        // Ruta para recibir los datos y las fotos
        app.post('/api/upload', upload.array('fotos', 3), async (req, res) => {
            try {
                const { tipo, observaciones } = req.body;
                const nombresFotos = req.files.map(file => file.filename);

                if (tipo === 'cortes' && nombresFotos.length < 3) {
                    return res.status(400).json({ error: 'Se requieren 3 fotos para cortes.' });
                }

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
        const PORT = process.env.PORT || 10000; // Render usa el 10000 por defecto
        app.listen(PORT, () => {
            console.log(`🚀 AquaBit OP corriendo en puerto ${PORT}`);
        });

    } catch (error) {
        console.error('❌ No se pudo iniciar la aplicación:', error);
    }
}

startApp();