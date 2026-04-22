const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir JSON pesados para las listas de URLs
app.use(express.static('public')); // Para servir tu index.html desde la carpeta public

// 1. Configuración de la Base de Datos (PostgreSQL)
// Asegúrate de tener DATABASE_URL en tus variables de entorno de Render
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

// 2. Modelo de Datos (Define la estructura del historial)
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
        type: DataTypes.JSON, // Almacena el array de URLs de Supabase
        allowNull: false,
        defaultValue: []
    },
    verificado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'Registros',
    timestamps: true // Esto crea automáticamente createdAt y updatedAt
});

// 3. Rutas de la API

// Obtener historial por tipo (Corte o Reposición)
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo },
            order: [['createdAt', 'DESC']] // Los más nuevos primero
        });
        res.json(registros);
    } catch (error) {
        console.error('Error al obtener registros:', error);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

// Crear nuevo registro (Subida desde el celular)
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos, verificado } = req.body;

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos,
            verificado: verificado || false
        });

        res.status(201).json({
            success: true,
            message: 'Registro guardado con éxito',
            data: nuevoRegistro
        });
    } catch (error) {
        console.error('Error al guardar registro:', error);
        res.status(500).json({ error: 'Error al guardar en la base de datos' });
    }
});

// Eliminar un registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Registro.destroy({ where: { id } });

        if (eliminado) {
            res.json({ success: true, message: 'Registro eliminado' });
        } else {
            res.status(404).json({ error: 'Registro no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 4. Inicialización del Servidor
async function iniciarServidor() {
    try {
        // Autenticar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida.');

        // Sincronizar modelos (Crea la tabla si no existe)
        await sequelize.sync();
        console.log('✅ Modelos sincronizados con la base de datos.');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor AquaBit OP corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error);
    }
}

iniciarServidor();