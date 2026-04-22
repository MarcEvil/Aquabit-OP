const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT },
    fotos: { type: DataTypes.JSON, allowNull: false, defaultValue: [] }
}, { timestamps: true });

// Obtener historial
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const registros = await Registro.findAll({
            where: { tipo: req.params.tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (e) { res.status(500).send(e.message); }
});

// Crear registro inicial
app.post('/api/upload', async (req, res) => {
    try {
        const nuevo = await Registro.create(req.body);
        res.status(201).json(nuevo);
    } catch (e) { res.status(500).send(e.message); }
});

// ACTUALIZACIÓN INDIVIDUAL: Marcar una foto específica como repuesto
app.patch('/api/registros/:id/foto/:index', async (req, res) => {
    try {
        const { id, index } = req.params;
        const reg = await Registro.findByPk(id);
        if (!reg) return res.status(404).send("No encontrado");

        let fotosUpdate = [...reg.fotos];
        // Normalizamos a objeto si era string, y marcamos verificado
        if (typeof fotosUpdate[index] === 'string') {
            fotosUpdate[index] = { url: fotosUpdate[index], verificado: true };
        } else {
            fotosUpdate[index] = { ...fotosUpdate[index], verificado: true };
        }

        reg.fotos = fotosUpdate;
        await reg.save();
        res.json(reg);
    } catch (e) { res.status(500).send(e.message); }
});

// Eliminar registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        await Registro.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).send(e.message); }
});

async function start() {
    await sequelize.sync();
    app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
}
start();