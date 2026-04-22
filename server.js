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

// 1. CONEXIÓN A BASE DE DATOS
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

// 2. DEFINICIÓN DEL MODELO
const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    fotos: { type: DataTypes.JSON, allowNull: false }
}, {
    tableName: 'Registros',
    freezeTableName: true,
    timestamps: true
});

// 3. RUTAS DE LA API

// GET: Obtener historial
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const registros = await Registro.findAll({
            where: { tipo: req.params.tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Guardar registro (Espera JSON con URLs)
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;
        const nuevo = await Registro.create({ tipo, observaciones, fotos });
        res.json({ success: true, data: nuevo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar registro (Agregado)
app.delete('/api/registros/:id', async (req, res) => {
    try {
        await Registro.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. INICIO
async function startServer() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
    } catch (error) {
        console.error('❌ Error:', error);
    }
}
startServer();