const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE SEGURIDAD Y LÍMITES
// Aumentamos el límite a 50mb para que el JSON con muchas URLs no sea rechazado
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. CONEXIÓN A LA BASE DE DATOS (PostgreSQL en Render)
const pool = new Pool({
    connectionString: "postgresql://aquabit_db_user:mZ7X8hY76U6S5r6T9p8Q@ep-blue-cloud-a5x8j9k0.us-east-2.aws.neon.tech/aquabit_db?sslmode=require",
});

// Probar conexión inicial
pool.connect((err, client, release) => {
    if (err) return console.error('❌ Error de conexión a la DB:', err.stack);
    console.log('✅ Conectado a PostgreSQL en Render');
    release();
});

// 3. RUTAS DE LA API

// Obtener registros por tipo (Corte o Reposición)
app.get('/api/registros/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const result = await pool.query(
            'SELECT * FROM registros WHERE tipo = $1 ORDER BY "createdAt" DESC',
            [tipo]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// Guardar nuevo registro
app.post('/api/upload', async (req, res) => {
    const { tipo, observaciones, fotos } = req.body;

    if (!tipo || !fotos || fotos.length === 0) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const query = 'INSERT INTO registros (tipo, observaciones, fotos, "createdAt") VALUES ($1, $2, $3, NOW()) RETURNING *';
        const values = [tipo, observaciones, fotos];
        const result = await pool.query(query, values);

        console.log(`✅ Nuevo registro guardado: ${tipo}`);
        res.status(201).json(result.rows);
    } catch (err) {
        console.error('❌ Error al guardar:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar un registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM registros WHERE id = $1', [id]);
        res.json({ message: 'Registro eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// 4. SERVIR ARCHIVOS ESTÁTICOS (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor AquaBit OP corriendo en puerto ${PORT}`);
});