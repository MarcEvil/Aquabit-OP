const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN SUPABASE STORAGE ---
const supabase = createClient(
    'https://mjxpqxyxkshtqlptccto.supabase.co', // Tu URL de proyecto
    process.env.SUPABASE_KEY // Necesitas poner tu "anon key" en las variables de Render
);

// --- CONFIGURACIÓN DE MULTER (Temporal) ---
const upload = multer({ dest: '/tmp' }); // Usamos la carpeta temporal de Render

// --- CONEXIÓN SEQUELIZE (DATABASE) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false
});

// --- MODELO ---
const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT },
    fotos: { type: DataTypes.JSON, allowNull: false } // Guardaremos las URLs de Supabase
});

// --- RUTAS ---

/** 1. GUARDAR Y SUBIR A STORAGE **/
app.post('/api/upload', upload.array('fotos', 3), async (req, res) => {
    try {
        const { tipo, observaciones } = req.body;
        const urlsFotos = [];

        for (const file of req.files) {
            const fileContent = fs.readFileSync(file.path);
            const fileName = `${Date.now()}-${file.originalname}`;

            // Subir al Bucket "fotos-aquabit"
            const { data, error } = await supabase.storage
                .from('fotos-aquabit')
                .upload(fileName, fileContent, { contentType: file.mimetype });

            if (error) throw error;

            // Obtener URL pública
            const { data: publicUrl } = supabase.storage
                .from('fotos-aquabit')
                .getPublicUrl(fileName);

            urlsFotos.push(publicUrl.publicUrl);
        }

        const nuevo = await Registro.create({ tipo, observaciones, fotos: urlsFotos });
        res.status(201).json(nuevo);

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Fallo al subir a Supabase Storage' });
    }
});

/** 2. LISTADO (Para la pestaña Corte) **/
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const registros = await sequelize.findAll({
            where: { tipo: req.params.tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar' });
    }
});

/** 3. ELIMINAR **/
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const registro = await Registro.findByPk(req.params.id);
        if (!registro) return res.status(404).send('No encontrado');

        // Borrar del Storage de Supabase
        for (const url of registro.fotos) {
            const fileName = url.split('/').pop();
            await supabase.storage.from('fotos-aquabit').remove([fileName]);
        }

        await registro.destroy();
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).send('Error al eliminar');
    }
});

const PORT = process.env.PORT || 10000;
sequelize.sync().then(() => {
    app.listen(PORT, () => console.log(`🚀 Gratis y funcional en puerto ${PORT}`));
});