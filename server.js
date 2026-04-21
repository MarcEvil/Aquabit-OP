const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ESTO ES VITAL: Sirve los archivos de la carpeta 'public' (tu index.html)
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN SUPABASE STORAGE ---
const supabase = createClient(
    'https://mjxpqxyxkshtqlptccto.supabase.co',
    process.env.SUPABASE_KEY
);

// --- CONFIGURACIÓN DE MULTER (Temporal para procesar la subida) ---
const upload = multer({ dest: '/tmp' });

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
    fotos: { type: DataTypes.JSON, allowNull: false }
});

// --- RUTAS DE LA API ---

/** 1. SUBIR FOTOS Y GUARDAR DATOS **/
app.post('/api/upload', upload.array('fotos', 3), async (req, res) => {
    try {
        const { tipo, observaciones } = req.body;
        const urlsFotos = [];

        // Subir cada archivo a Supabase Storage
        for (const file of req.files) {
            const fileContent = fs.readFileSync(file.path);
            const fileName = `${Date.now()}-${file.originalname}`;

            const { data, error } = await supabase.storage
                .from('fotos-aquabit')
                .upload(fileName, fileContent, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (error) throw error;

            // Obtener la URL pública del archivo subido
            const { data: publicUrl } = supabase.storage
                .from('fotos-aquabit')
                .getPublicUrl(fileName);

            urlsFotos.push(publicUrl.publicUrl);

            // Borrar archivo temporal de Render para no llenar espacio
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos: urlsFotos
        });

        res.status(201).json(nuevoRegistro);
    } catch (error) {
        console.error('❌ Error en /api/upload:', error);
        res.status(500).json({ error: 'Fallo al procesar el registro' });
    }
});

/** 2. OBTENER LISTADO POR TIPO (Corte o Reposición) **/
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const registros = await sequelize.findAll({
            where: { tipo: req.params.tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

/** 3. ELIMINAR GRUPO DE FOTOS **/
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const registro = await Registro.findByPk(req.params.id);
        if (!registro) return res.status(404).json({ error: 'No encontrado' });

        // Intentar borrar las fotos del Storage de Supabase
        for (const url of registro.fotos) {
            const fileName = url.split('/').pop();
            await supabase.storage.from('fotos-aquabit').remove([fileName]);
        }

        await registro.destroy();
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error al eliminar:', error);
        res.status(500).json({ error: 'Fallo al borrar' });
    }
});

// --- INICIALIZACIÓN ---
const PORT = process.env.PORT || 10000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de Datos Conectada.');

        await sequelize.sync();
        console.log('✅ Tablas sincronizadas.');

        app.listen(PORT, () => {
            console.log(`🚀 AquaBit OP listo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
    }
}

startServer();