const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Para borrar archivos físicos si es necesario
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Esto permite que las fotos sean visibles por URL

// --- CONFIGURACIÓN DE STORAGE (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir); // Crea la carpeta si no existe
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- CONEXIÓN A BASE DE DATOS (SEQUELIZE) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
        prepareThreshold: 0
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    logging: false
});

// --- DEFINICIÓN DEL MODELO ---
const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    fotos: { type: DataTypes.JSON, allowNull: false } // Guarda los nombres como ["img1.jpg", "img2.jpg", "img3.jpg"]
});

// --- RUTAS API ---

/** 1. GUARDAR REGISTRO (POST) **/
app.post('/api/upload', upload.array('fotos', 3), async (req, res) => {
    try {
        const { tipo, observaciones } = req.body;
        const nombresFotos = req.files.map(file => file.filename);

        if (tipo === 'corte' && nombresFotos.length !== 3) {
            return res.status(400).json({ error: 'La pestaña Corte requiere exactamente 3 fotos.' });
        }

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos: nombresFotos
        });

        res.status(201).json(nuevoRegistro);
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        res.status(500).json({ error: 'Error interno al guardar registro' });
    }
});

/** 2. OBTENER LISTADO (GET) **/
// Esto permitirá que tu celular pida todos los registros de "corte" para listarlos hacia abajo
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const registros = await sequelize.findAll({
            where: { tipo: req.params.tipo },
            order: [['createdAt', 'DESC']] // Los más nuevos arriba
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener listado' });
    }
});

/** 3. ELIMINAR REGISTRO (DELETE) **/
// Para el botón de "Eliminar fotos" que pediste
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const registro = await Registro.findByPk(req.params.id);
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

        // Opcional: Borrar archivos físicos de la carpeta uploads
        registro.fotos.forEach(foto => {
            const pathFoto = path.join(__dirname, 'uploads', foto);
            if (fs.existsSync(pathFoto)) fs.unlinkSync(pathFoto);
        });

        await registro.destroy();
        res.json({ message: 'Grupo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 10000;
async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync(); // Asegura que la tabla exista
        app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));
    } catch (e) {
        console.error('Error al iniciar:', e);
    }
}
start();