const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const cors = require('cors'); // Importar cors
require('dotenv').config();

const app = express();

const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Configurar CORS
app.use(cors({
  origin: '*', // Permite solicitudes de cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type'], // Encabezados permitidos
}));

// Configurar multer para manejar la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta para subir el archivo y obtener los datos en formato JSON
app.post('/api/subirPagos', upload.single('archivo'), async (req, res) => {
  let inserts = 0;
  let updates = 0;
  let errores = 0;

  try {
    // Leer el archivo subido desde el buffer de memoria
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersJSON=[
      'nombreSucursal',     'idTratamiento',     'convenioTratamiento',
      'nombreProfTrat',     'apellidosProfTrat', 'especialidadProfTrat',
      'receptorPago',       'idPago',            'idTransaccion',
      'esDevolucion',       'idPagoRelacionado', 'fechaRecepcionPago',
      'mesRecepcionPago',   'anioRecepcionPago', 'idPaciente',
      'rucPaciente',        'nombrePaciente',    'apellidosPaciente',
      'comunaPaciente',     'tipoPaciente',      'referenciaPaciente',
      'numInterno',         'rucApoderado',      'nombreApoderado',
      'convenioApoderado',  'idBoleta',          'totalPago',
      'totalAsociado',      'medioPago',         'nombreBanco',
      'rut',                'idReferencia',      'codigoAutorizacion',
      'ultimos4digitos',    'numCuotas',         'estadoPago',
      'fechaVencimiento',   'mesVencimiento',    'anioVencimiento',
      'fechaGeneracion',    'mesGeneracion',     'anioGeneracion',
      'agente',             'diagnosticador',    'estadoCivil',
      'numHijos',           'redSocial',         'usuarioRedSocial',
      'profesionApoderado', 'sucursalAtencion',  'seguimientoPaciente'
    ];
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    console.log("headers");
    console.log(headers)
    console.log("sheetName::"+sheetName+" rows::"+rows.length);
    if(headersJSON.length!=headers.length){

      console.error('Error al procesar el archivo Excel, formato icompatible');
      res.status(500).json({ message: 'Error al procesar el archivo Excel, formato icompatible', inserts, updates, errores });
      return;
    }
    const data = rows.map(row => {
      let rowData = {};
      headersJSON.forEach((key, i) => {
        rowData[key] = row[i];
      });
      return rowData;
    });

    // Conexión a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    

    // Consulta de inserción
    const insertQuery = `
      INSERT INTO pagos (
        nombreSucursal, idTratamiento, convenioTratamiento, nombreProfTrat, apellidosProfTrat, especialidadProfTrat, 
        receptorPago, idTransaccion, esDevolucion, idPagoRelacionado, fechaRecepcionPago, mesRecepcionPago, 
        anioRecepcionPago, idPaciente, rucPaciente, nombrePaciente, apellidosPaciente, comunaPaciente, tipoPaciente, 
        referenciaPaciente, numInterno, rucApoderado, nombreApoderado, convenioApoderado, idBoleta, totalPago, 
        totalAsociado, medioPago, nombreBanco, rut, idReferencia, codigoAutorizacion, ultimos4digitos, numCuotas, 
        estadoPago, fechaVencimiento, mesVencimiento, anioVencimiento, fechaGeneracion, mesGeneracion, 
        anioGeneracion, agente, diagnosticador, estadoCivil, numHijos, redSocial, usuarioRedSocial, profesionApoderado, 
        sucursalAtencion, seguimientoPaciente, idPago
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;
    
    // Consulta de actualización
    const updateQuery = `
      UPDATE pagos SET 
        nombreSucursal = ?, idTratamiento = ?, convenioTratamiento = ?, nombreProfTrat = ?, apellidosProfTrat = ?, especialidadProfTrat = ?, 
        receptorPago = ?, idTransaccion = ?, esDevolucion = ?, idPagoRelacionado = ?, fechaRecepcionPago = ?, mesRecepcionPago = ?, 
        anioRecepcionPago = ?, idPaciente = ?, rucPaciente = ?, nombrePaciente = ?, apellidosPaciente = ?, comunaPaciente = ?, 
        tipoPaciente = ?, referenciaPaciente = ?, numInterno = ?, rucApoderado = ?, nombreApoderado = ?, convenioApoderado = ?, 
        idBoleta = ?, totalPago = ?, totalAsociado = ?, medioPago = ?, nombreBanco = ?, rut = ?, idReferencia = ?, 
        codigoAutorizacion = ?, ultimos4digitos = ?, numCuotas = ?, estadoPago = ?, fechaVencimiento = ?, mesVencimiento = ?, 
        anioVencimiento = ?, fechaGeneracion = ?, mesGeneracion = ?, anioGeneracion = ?, agente = ?, diagnosticador = ?, 
        estadoCivil = ?, numHijos = ?, redSocial = ?, usuarioRedSocial = ?, profesionApoderado = ?, sucursalAtencion = ?, 
        seguimientoPaciente = ?
      WHERE idPago = ?
    `;

    // Procesar cada fila de datos
    for (const pago of data) {
      const valuesNet = [
        pago.nombreSucursal, pago.idTratamiento, pago.convenioTratamiento, pago.nombreProfTrat, pago.apellidosProfTrat, 
        pago.especialidadProfTrat, pago.receptorPago, pago.idTransaccion, pago.esDevolucion, pago.idPagoRelacionado, 
        pago.fechaRecepcionPago, pago.mesRecepcionPago, pago.anioRecepcionPago, pago.idPaciente, pago.rucPaciente, 
        pago.nombrePaciente, pago.apellidosPaciente, pago.comunaPaciente, pago.tipoPaciente, pago.referenciaPaciente, 
        pago.numInterno, pago.rucApoderado, pago.nombreApoderado, pago.convenioApoderado, pago.idBoleta, pago.totalPago, 
        pago.totalAsociado, pago.medioPago, pago.nombreBanco, pago.rut, pago.idReferencia, pago.codigoAutorizacion, 
        pago.ultimos4digitos, pago.numCuotas, pago.estadoPago, pago.fechaVencimiento, pago.mesVencimiento, 
        pago.anioVencimiento, pago.fechaGeneracion, pago.mesGeneracion, pago.anioGeneracion, pago.agente, pago.diagnosticador, 
        pago.estadoCivil, pago.numHijos, pago.redSocial, pago.usuarioRedSocial, pago.profesionApoderado, pago.sucursalAtencion, 
        pago.seguimientoPaciente, pago.idPago
      ];

      // Sanitizar los valores para reemplazar undefined con null
      const values = sanitizeValues(valuesNet);

      try {        
        // Intentar insertar el registro
        await connection.execute(insertQuery, values);
        inserts++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Si ya existe, intentar actualizar
          try {
            await connection.execute(updateQuery, [...values]);
            updates++;
          } catch (updateError) {
            errores++;
          }
        } else {
          errores++;
        }
      }
    }

    // Cerrar la conexión
    await connection.end();

    // Enviar el reporte de la operación
    res.status(200).json({ message: 'Operación completada', inserts, updates, errores });
    return;
  } catch (error) {
    console.error('Error al procesar el archivo Excel:', error);
    
    res.status(500).json({ message: 'Error al procesar el archivo Excel', inserts, updates, errores });
    return;
  }
});


// Ruta para subir el archivo y procesar las citas
app.post('/api/subirCitas', upload.single('archivo'), async (req, res) => {
  
  let inserts = 0;
  let updates = 0;
  let errores = 0;

  try {
    // Leer el archivo subido desde el buffer de memoria
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersJSON=[
      'idCita',              'estadoCita',         'fechaCita',
      'mesCita',             'anioCita',           'horaInicioCita',
      'horaFinCita',         'comentarioCita',     'sillon',
      'idTratamiento',       'nombreProfCita',     'apellidosProfCita',
      'idPaciente',          'numInterno',         'rucPaciente',
      'nombrePaciente',      'apellidosPaciente',  'fechaNac',
      'email',               'telefono',           'celular',
      'referenciaPaciente',  'rucApoderado',       'nombreApoderado',
      'telefonoApoderado',   'celularApoderado',   'convenioPaciente',
      'convenioTratamiento', 'tipoPaciente',       'fechaGenTrat',
      'mesdeGenTrat',        'aniodeGenTrat',      'nombreSucursal',
      'agendadoPor',         'fechaCreacionCita',  'Observaciones',
      'motivoAtencion',      'agente',             'diagnosticador',
      'estadoCivil',         'numHijos',           'redSocial',
      'usuarioRedSocial',    'profesionApoderado', 'sucuarsalAtencion',
      'seguimeintoPaciente'
    ];
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    
    console.log("headers");
    console.log(headers)

    console.log("sheetName::"+sheetName+" rows::"+rows.length);

    console.log("headerJSON::"+headersJSON.length+" headers::"+headers.length);

    if(headersJSON.length!=headers.length){

      console.error('Error al procesar el archivo Excel, formato icompatible');
      
    res.status(500).json({ message: 'Error al procesar el archivo Excel, formato icompatible', inserts, updates, errores });
    return;
    }

    const citas = rows.map(row => {
      let rowData = {};
      headersJSON.forEach((key, i) => {
        rowData[key] = row[i];
      });
      return rowData;
    });

    // Conexión a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Query para insertar datos en la tabla citas
    const insertQuery = `
      INSERT INTO citas (
        estadoCita, fechaCita, mesCita, anioCita, horaInicioCita, 
        horaFinCita, comentarioCita, sillon, idTratamiento, nombreProfCita, 
        apellidosProfCita, idPaciente, numInterno, rucPaciente, nombrePaciente, 
        apellidosPaciente, fechaNac, email, telefono, celular, referenciaPaciente, 
        rucApoderado, nombreApoderado, telefonoApoderado, celularApoderado, 
        convenioPaciente, convenioTratamiento, tipoPaciente, fechaGenTrat, 
        mesdeGenTrat, aniodeGenTrat, nombreSucursal, agendadoPor, 
        fechaCreacionCita, Observaciones, motivoAtencion, agente, 
        diagnosticador, estadoCivil, numHijos, redSocial, usuarioRedSocial, 
        profesionApoderado, sucursalAtencion, seguimientoPaciente, idCita
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Query para actualizar datos en la tabla citas
    const updateQuery = `
      UPDATE citas SET
        estadoCita = ?, fechaCita = ?, mesCita = ?, anioCita = ?, horaInicioCita = ?, 
        horaFinCita = ?, comentarioCita = ?, sillon = ?, idTratamiento = ?, nombreProfCita = ?, 
        apellidosProfCita = ?, idPaciente = ?, numInterno = ?, rucPaciente = ?, nombrePaciente = ?, 
        apellidosPaciente = ?, fechaNac = ?, email = ?, telefono = ?, celular = ?, 
        referenciaPaciente = ?, rucApoderado = ?, nombreApoderado = ?, telefonoApoderado = ?, 
        celularApoderado = ?, convenioPaciente = ?, convenioTratamiento = ?, tipoPaciente = ?, 
        fechaGenTrat = ?, mesdeGenTrat = ?, aniodeGenTrat = ?, nombreSucursal = ?, 
        agendadoPor = ?, fechaCreacionCita = ?, Observaciones = ?, motivoAtencion = ?, agente = ?, 
        diagnosticador = ?, estadoCivil = ?, numHijos = ?, redSocial = ?, usuarioRedSocial = ?, 
        profesionApoderado = ?, sucursalAtencion = ?, seguimientoPaciente = ?
      WHERE idCita = ?
    `;

    // Iterar sobre cada cita y ejecutar la inserción o actualización
    for (const cita of citas) {
      const valuesNet = [
        cita.estadoCita, cita.fechaCita, cita.mesCita, cita.anioCita, cita.horaInicioCita,
        cita.horaFinCita, cita.comentarioCita, cita.sillon, cita.idTratamiento, cita.nombreProfCita,
        cita.apellidosProfCita, cita.idPaciente, cita.numInterno, cita.rucPaciente, cita.nombrePaciente,
        cita.apellidosPaciente, cita.fechaNac, cita.email, cita.telefono, cita.celular, cita.referenciaPaciente,
        cita.rucApoderado, cita.nombreApoderado, cita.telefonoApoderado, cita.celularApoderado,
        cita.convenioPaciente, cita.convenioTratamiento, cita.tipoPaciente, cita.fechaGenTrat,
        cita.mesdeGenTrat, cita.aniodeGenTrat, cita.nombreSucursal, cita.agendadoPor,
        cita.fechaCreacionCita, cita.Observaciones, cita.motivoAtencion, cita.agente,
        cita.diagnosticador, cita.estadoCivil, cita.numHijos, cita.redSocial, cita.usuarioRedSocial,
        cita.profesionApoderado, cita.sucursalAtencion, cita.seguimientoPaciente, cita.idCita
      ];

      const values = sanitizeValues(valuesNet);

      try {
        // Intentar insertar el registro
        await connection.execute(insertQuery, values);
        inserts++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Si ya existe, intentar actualizar
          try {
            await connection.execute(updateQuery, [...values]);
            updates++;
          } catch (updateError) {
            console.error('Error al actualizar cita:', updateError);
            errores++;
          }
        } else {
          console.error('Error al insertar cita:', error);
          errores++;
        }
      }
    }

    // Cerrar la conexión
    await connection.end();

    // Enviar el reporte de la operación
    res.status(200).json({ message: 'Operación completada', inserts, updates, errores });
    return;
  } catch (error) {
    console.error('Error al procesar el archivo JSON:', error);
    res.status(500).json({ message: 'Error al procesar el archivo JSON', inserts, updates, errores });
    return;
  }
});

// Ruta para agregar un registro en base_documental
app.post('/api/agregarDocumento', async (req, res) => {
  const { file_name, result, user, fechaAuditoria,type } = req.body;

  if (!file_name || !result || !user || !fechaAuditoria) {
    return res.status(400).json({ ok: false, msg: 'Todos los campos son requeridos' });
  }

  try {
    // Conexión a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Consulta SQL para insertar datos en documentos
    const insertQuery = `
      INSERT INTO documentos (fileName, result, \`user\`, fechaAuditoria, type)
      VALUES (?, ?, ?, ?, ?)
    `;

    // Ejecutar la consulta
    const [insertResult] = await connection.execute(insertQuery, [file_name, result, user, fechaAuditoria,type]);

    // Consulta SQL para obtener todos los documentos filtrados por fechaAuditoria
    const selectQuery = `
      SELECT * FROM documentos
      WHERE fechaAuditoria = ?
    `;

    // Ejecutar la consulta
    const [documents] = await connection.execute(selectQuery, [fechaAuditoria]);

    // Cerrar la conexión
    await connection.end();

    res.status(200).json({
      ok: true,
      data: documents,
      msg: 'Registro agregado correctamente',
      id: insertResult.insertId
    });
  } catch (error) {
    console.error('Error al agregar registro a documentos:', error);
    res.status(500).json({ ok: false, msg: 'Error al agregar registro a documentos' });
  }
});

app.post('/api/documentosPorFecha', async (req, res) => {
  const { fechaAuditoria } = req.body;

  if (!fechaAuditoria) {
    return res.status(400).json({ ok: false, msg: 'El parámetro fechaAuditoria es requerido' });
  }

  try {
    // Conexión a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Consulta SQL para obtener documentos por fechaAuditoria
    const selectQuery = `
      SELECT * FROM documentos
      WHERE fechaAuditoria = ?
    `;

    // Ejecutar la consulta
    const [documents] = await connection.execute(selectQuery, [fechaAuditoria]);

    // Cerrar la conexión
    await connection.end();

    res.status(200).json({
      ok: true,
      data: documents,
      msg: 'Documentos consultados correctamente'
    });
  } catch (error) {
    console.error('Error al consultar documentos por fechaAuditoria:', error);
    res.status(500).json({ ok: false, msg: 'Error al consultar documentos' });
  }
});


app.post('/api/getDayliList', async (req, res) => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const { fecha, doctoresList } = req.body;

  if (!fecha || !Array.isArray(doctoresList)) {
    return res.status(400).json({ ok:false,msg: 'Parámetros "fecha" y "doctoresList" son requeridos y "doctoresList" debe ser un array' });
  }

  // Convertir el array de doctores en una cadena separada por comas
  const doctoresPlaceholders = doctoresList.map(() => '?').join(', ');

  // Consulta SQL con parámetros
  const sql = `
  SELECT 
  c.nombreSucursal,
  c.idTratamiento,
  c.idPaciente,
  c.idCita,
  CAST(c.fechaCita AS CHAR) as fechaCita,
   COALESCE(CAST(c2.proximaCita AS CHAR), 'No tiene cita futura') AS proximaCita,
  c.nombreProfCita,
  c.apellidosProfCita,
  c.nombrePaciente,
  c.apellidosPaciente,
  c.estadoCita,
  COALESCE(SUM(p.totalPago), 0) AS sumTotal,
  COALESCE(SUM(p.totalAsociado), 0) AS sumAsociado,
  CASE
    WHEN COALESCE(SUM(p.totalPago), 0) < 400 THEN 'DIAGNOSTICA'
    WHEN COALESCE(SUM(p.totalPago), 0) BETWEEN 401 AND 1200 THEN 'HIGIENICA'
    WHEN COALESCE(SUM(p.totalPago), 0) > 1200 THEN 'CORRECTIVA'
  END AS fase
FROM 
  (SELECT DISTINCT idTratamiento, idPaciente, citas.idCita, citas.fechaCita, citas.nombreProfCita, citas.apellidosProfCita, citas.nombrePaciente, citas.apellidosPaciente, citas.estadoCita, citas.nombreSucursal  
   FROM citas 
   WHERE fechaCita = ?
     AND estadoCita IN ('Atendido','Diagnóstico No Cerrado','Diagnóstico Cerrado', 'Atendiéndose', 'Paciente en Proceso')
     AND apellidosProfCita IN (${doctoresPlaceholders})
  ) c
LEFT JOIN 
  pagos p ON p.idTratamiento = c.idTratamiento
LEFT JOIN 
  (SELECT *, citas.fechaCita as proximaCita
   FROM citas 
   WHERE fechaCita > ?
     AND estadoCita IN ('Atendido','Diagnóstico No Cerrado','Diagnóstico Cerrado', 'Atendiéndose', 'Paciente en Proceso', 'No confirmado','Confirmado por teléfono','Contactado por chat de WhatsApp','Confirmado por CERO wsp')
  ) c2
ON 
  c.idPaciente = c2.idPaciente
GROUP BY 
  c.idTratamiento, c.nombreSucursal, c.idPaciente, c.idCita, c.fechaCita, c.nombreProfCita, c.apellidosProfCita, c.nombrePaciente, c.apellidosPaciente, c.estadoCita
ORDER BY 
  fase DESC;
  `;

  try {
    const [rows] = await pool.query(sql, [fecha, ...doctoresList, fecha]);
    res.status(200).json({ ok:true,msg:'Consulta correcta' ,data:rows});
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok:false,msg:'Error al ejecutar la consulta' });
  }
});

const sanitizeValues = (values) => values.map(value => (value === undefined ? null : value));

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
