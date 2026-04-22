const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de CORS para permitir peticiones desde cualquier origen (móviles/web)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Conexión a Base de Datos con SSL obligatorio para Supabase
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

// Modelo exacto (Nota la R mayúscula en Registros para que coincida con tu DB)
// --- DEFINICIÓN DEL MODELO ---
const Registro = sequelize.define('Registro', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    fotos: { type: DataTypes.JSON, allowNull: false }
}, {
    tableName: 'Registros', // <--- ESTO ES VITAL: Debe ser idéntico a tu imagen
    timestamps: true,      // Sequelize buscará createdAt y updatedAt automáticamente
    freezeTableName: true  // Evita que Sequelize intente pluralizar el nombre
});

// Rutas de la API
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        console.error('Error GET:', error.message);
        res.status(500).json({ error: 'Error al obtener historial', detalle: error.message });
    }
});

app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;
        const nuevo = await Registro.create({ tipo, observaciones, fotos });
        res.json({ success: true, data: nuevo });
    } catch (error) {
        console.error('Error POST:', error.message);
        res.status(500).json({ error: 'Error al guardar', detalle: error.message });
    }
});

app.delete('/api/registros/:id', async (req, res) => {
    try {
        await Registro.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
    }
});

// Sincronización e Inicio
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de Datos Conectada.');
        await sequelize.sync(); // Esto no borra datos, solo asegura que el modelo exista
        app.listen(PORT, () => {
            console.log(`🚀 AquaBit OP listo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Fallo total de conexión:', error);
    }
}

startServer();