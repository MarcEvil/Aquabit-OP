const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para manejo de datos y CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// 1. Conexión a la Base de Datos (PostgreSQL en Render)
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

// 2. Modelo de Datos "Registro"
// Incluimos campos para persistencia de fotos y estados
const Registro = sequelize.define('Registro', {
    tipo: {
        type: DataTypes.STRING, // 'corte' o 'reposicion'
        allowNull: false
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fotos: {
        type: DataTypes.JSON, // Guarda el array de URLs de Supabase
        allowNull: false,
        defaultValue: []
    }
}, {
    tableName: 'Registros',
    timestamps: true // Crea automáticamente createdAt y updatedAt
});

// 3. Endpoints de la API

// Obtener registros por tipo (Persistencia de historial)
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo },
            order: [['createdAt', 'DESC']] // Los más recientes arriba
        });
        res.json(registros);
    } catch (error) {
        console.error('Error al obtener registros:', error);
        res.status(500).json({ error: 'Error al consultar PostgreSQL' });
    }
});

// Guardar nuevo registro (Desde el botón Guardar Trabajo)
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos // Almacena las URLs reales de Supabase
        });

        res.status(201).json({
            success: true,
            data: nuevoRegistro
        });
    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ error: 'Error al guardar en base de datos' });
    }
});

// Eliminar registro del historial
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const borrado = await Registro.destroy({ where: { id } });

        if (borrado) {
            res.json({ success: true, message: 'Registro eliminado' });
        } else {
            res.status(404).json({ error: 'No se encontró el registro' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// 4. Inicialización con sincronización
async function bootstrap() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a Base de Datos OK');

        // Sincroniza el modelo con PostgreSQL (crea la tabla si falta)
        await sequelize.sync();
        console.log('✅ Tablas sincronizadas');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor AquaBit operativo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error de inicio:', error);
    }
}

bootstrap();