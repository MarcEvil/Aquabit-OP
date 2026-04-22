const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentamos el límite para recibir múltiples URLs
app.use(express.static('public'));

// 1. Conexión a PostgreSQL (Render)
// Asegúrate de tener la variable DATABASE_URL configurada en el Dashboard de Render
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
// Estructura optimizada para guardar objetos de fotos {url, verificado}
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
        type: DataTypes.JSON, // Almacena el array de objetos: [{url, verificado}, ...]
        allowNull: false,
        defaultValue: []
    }
}, {
    tableName: 'Registros',
    timestamps: true // Esto genera createdAt automáticamente
});

// 3. Endpoints de la API

// GET: Obtener historial persistente por tipo
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const registros = await Registro.findAll({
            where: { tipo },
            order: [['createdAt', 'DESC']] // Los más recientes primero
        });
        res.json(registros);
    } catch (error) {
        console.error('Error al obtener registros:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// POST: Guardar nuevo registro desde terreno
app.post('/api/upload', async (req, res) => {
    try {
        const { tipo, observaciones, fotos } = req.body;

        const nuevoRegistro = await Registro.create({
            tipo,
            observaciones,
            fotos // Recibe el array con los estados de los checkboxes
        });

        res.status(201).json({
            success: true,
            data: nuevoRegistro
        });
    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ error: 'No se pudo guardar el registro' });
    }
});

// DELETE: Eliminar registro (Botón de basurero en el historial)
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const borrado = await Registro.destroy({ where: { id } });

        if (borrado) {
            res.json({ success: true, message: 'Registro eliminado' });
        } else {
            res.status(404).json({ error: 'Registro no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Error al intentar eliminar' });
    }
});

// 4. Inicialización del Sistema
async function iniciarApp() {
    try {
        // Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Base de Datos PostgreSQL: Conectada');

        // Sincronizar modelos (Crea o actualiza la tabla en Render)
        await sequelize.sync();
        console.log('✅ Tablas de AquaBit sincronizadas');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor AquaBit OP en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error crítico al iniciar el servidor:', error);
    }
}

iniciarApp();