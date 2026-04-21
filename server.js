const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// 1. CONEXIÓN A SUPABASE SQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// 2. MODELO (Configurado con Mayúscula para Registros)
const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    fotos: { type: DataTypes.JSON, allowNull: false }
}, {
    tableName: 'Registros', // Coincide con tu captura de Supabase
    freezeTableName: true,
    timestamps: true
});

// 3. RUTAS API

// Obtener historial
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial', detalle: error.message });
    }
});

// Guardar nuevo registro
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;
        const nuevo = await Registro.create({ tipo, observaciones, fotos });
        res.json({ success: true, data: nuevo });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar', detalle: error.message });
    }
});

// Eliminar registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const borrado = await Registro.destroy({ where: { id } });
        if (borrado) {
            res.json({ success: true, mensaje: 'Eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Registro no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
    }
});

// 4. ARRANQUE
async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        app.listen(PORT, () => console.log(`🚀 AquaBit OP en puerto ${PORT}`));
    } catch (e) {
        console.error('❌ Error de inicio:', e);
    }
}
start();