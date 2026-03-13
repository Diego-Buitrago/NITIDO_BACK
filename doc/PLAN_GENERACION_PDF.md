# Plan de Ejecución: Generación de PDF en el Backend

Este documento detalla los pasos técnicos para trasladar la lógica de generación de PDF de recibos desde el frontend al backend (Node.js/Express).

## 1. Requisitos Previos (Dependencias)

Ejecutar en la raíz de `NITIDO_BACK`:
```bash
yarn add pdfmake
yarn add -D @types/pdfmake
```

## 2. Implementación del Generador de PDF

Crear `src/utils/pdfGenerator.ts` con la lógica de `pdfmake`:
- Definir la estructura del documento (docDefinition).
- Incluir información del vendedor ( Gabriel Jaime Velásquez Álvarez).
- Replicar el diseño visual (cabecera, tablas, totales, etc.).
- Convertir el logo local a Base64 para incluirlo en el PDF.

## 3. Implementación del Controlador

Modificar `src/controller/receiptsController.ts`:
- Crear función `generateReceiptPDF`.
- Obtener datos del recibo (cabecera) y sus detalles vía SQL.
- Llamar al generador de PDF.
- Retornar el buffer del PDF con `Content-Type: application/pdf`.

## 4. Definición de Rutas

Modificar `src/routes/receiptsRoutes.ts`:
- Agregar: `router.get('/generate_pdf/:id', verifyToken, generateReceiptPDF);`

## 5. Verificación

- Probar el endpoint `GET /receipts/generate_pdf/:id` con un token válido.
- Verificar que el PDF se descargue correctamente y contenga la información esperada.
