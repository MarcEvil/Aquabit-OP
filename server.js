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

// 1. CONEXIÓN A BASE DE DATOS (SUPABASE SQL)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Limpia la consola de logs innecesarios
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// 2. DEFINICIÓN DEL MODELO (CORREGIDO)
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
        type: DataTypes.JSON, // Guardará el array de URLs de Supabase Storage
        allowNull: false
    }
}, {
    // ESTAS LÍNEAS SON VITALES PARA QUE COINCIDA CON TU TABLA EN SUPABASE
    tableName: 'Registros',
    freezeTableName: true,
    timestamps: true
});

// 3. RUTAS DE LA API

// Obtener historial por tipo (Corte o Reposición)
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo: tipo },
            order: [['createdAt', 'DESC']]
        });
        res.json(registros);
    } catch (error) {
        console.error('❌ Error SQL en GET:', error);
        // Enviamos el mensaje real para diagnosticar rápido si falta una columna o permiso
        res.status(500).json({ error: 'Error al obtener historial', detalle: error.message });
    }
});

// Guardar nuevo registro
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;

        if (!fotos || fotos.length === 0) {
            return res.status(400).json({ error: 'No se recibieron URLs de fotos' });
        }

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos // Array de URLs que vienen desde el frontend
        });

        res.json({ success: true, data: nuevoRegistro });
    } catch (error) {
        console.error('❌ Error SQL en POST:', error);
        res.status(500).json({ error: 'Error al guardar en base de datos', detalle: error.message });
    }
});

// 4. INICIO DEL SERVIDOR Y SINCRONIZACIÓN
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de Datos Conectada.');

        // Sincroniza el modelo con la tabla existente
        await sequelize.sync();
        console.log('✅ Tablas sincronizadas con Supabase.');

        app.listen(PORT, () => {
            console.log(`🚀 AquaBit OP listo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error);
    }
}

startServer();