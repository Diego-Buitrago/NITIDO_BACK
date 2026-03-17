// @ts-ignore
import PdfPrinter from 'pdfmake/js/Printer';
// @ts-ignore
import virtualfs from 'pdfmake/js/virtual-fs';
// @ts-ignore
import URLResolver from 'pdfmake/js/URLResolver';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import path from 'path';
import fs from 'fs';
import { fCurrency, formatDate } from './utils';

// Información del vendedor
export const SELLER_INFO = {
    name: 'Gabriel Jaime Velásquez Álvarez',
    document: '3438630',
    address: 'Km1+600 vía llanogrande el tablazo Rionegro Antioquia',
    phone: '3183807303',
};

// Configuración de fuentes usando archivos físicos de node_modules
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
    }
};

const urlResolver = new URLResolver(virtualfs);
const printer = new PdfPrinter(fonts, virtualfs, urlResolver);

export interface ReceiptPDFItem {
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface ReceiptPDFData {
    receiptNumber: string;
    date: Date;
    customerName: string;
    customerDocument: string;
    customerPhone: string;
    customerAddress: string;
    items: ReceiptPDFItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    notes: string;
}

const getLogoBase64 = (): string => {
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.jpeg');
    if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }
    return '';
};

export const generateReceiptPDFBuffer = async (data: ReceiptPDFData): Promise<Buffer> => {
    const logoBase64 = getLogoBase64();
    
    const itemsTableBody: any[][] = [
        [
            { text: 'Descripción', style: 'tableHeader' },
            { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
            { text: 'Precio Unit.', style: 'tableHeader', alignment: 'right' },
            { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
        ],
        ...data.items.map((item) => [
            item.description,
            { text: item.quantity.toString(), alignment: 'center' },
            { text: fCurrency(item.unitPrice), alignment: 'right' },
            { text: fCurrency(item.subtotal), alignment: 'right' },
        ]),
    ];

    const docDefinition: TDocumentDefinitions = {
        info: {
            title: `Recibo ${data.receiptNumber}`,
            author: SELLER_INFO.name,
            subject: 'Recibo de Venta',
            keywords: 'recibo venta',
            creator: 'Nitido',
            producer: 'Nitido',
            creationDate: data.date,
        },
        content: [
            // Header con logo y título
            {
                columns: [
                    ...(logoBase64 ? [{
                        image: logoBase64,
                        width: 60,
                        margin: [0, 0, 10, 0] as [number, number, number, number],
                    }] : []),
                    {
                        stack: [
                            { text: 'Recibo de Venta', style: 'header' },
                            { text: `No. ${data.receiptNumber}`, style: 'receiptNumber' },
                            { text: `Fecha: ${formatDate(data.date)}`, style: 'date' },
                        ],
                        margin: [10, 5, 0, 0] as [number, number, number, number],
                    },
                ],
                margin: [0, 0, 0, 20],
            },

            // Datos del Vendedor y Cliente
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'Datos del Vendedor', style: 'sectionTitle' },
                            {
                                table: {
                                    widths: ['auto', '*'],
                                    body: [
                                        [{ text: 'Nombre:', style: 'label' }, { text: SELLER_INFO.name, style: 'value' }],
                                        [{ text: 'Documento:', style: 'label' }, { text: SELLER_INFO.document, style: 'value' }],
                                        [{ text: 'Dirección:', style: 'label' }, { text: SELLER_INFO.address, style: 'value' }],
                                        [{ text: 'Teléfono:', style: 'label' }, { text: SELLER_INFO.phone, style: 'value' }],
                                    ],
                                },
                                layout: 'noBorders',
                            },
                        ],
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'Datos del Cliente', style: 'sectionTitle' },
                            {
                                table: {
                                    widths: ['auto', '*'],
                                    body: [
                                        [{ text: 'Nombre:', style: 'label' }, { text: data.customerName, style: 'value' }],
                                        [{ text: 'Documento:', style: 'label' }, { text: data.customerDocument, style: 'value' }],
                                        [{ text: 'Dirección:', style: 'label' }, { text: data.customerAddress || 'N/A', style: 'value' }],
                                        [{ text: 'Teléfono:', style: 'label' }, { text: data.customerPhone || 'N/A', style: 'value' }],
                                    ],
                                },
                                layout: 'noBorders',
                            },
                        ],
                    },
                ],
                margin: [0, 0, 0, 15],
            },

            // Productos / Servicios
            { text: 'Productos / Servicios', style: 'sectionTitle' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 60, 80, 80],
                    body: itemsTableBody,
                },
                layout: {
                    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#e5e7eb',
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                },
                margin: [0, 0, 0, 15],
            },

            // Pago y Resumen
            {
                columns: [
                    {
                        width: '55%',
                        stack: [
                            { text: 'Pago', style: 'sectionTitle' },
                            {
                                columns: [
                                    { text: 'Método de pago:', style: 'label', width: 85 },
                                    { text: data.paymentMethod, style: 'value' },
                                ],
                                margin: [0, 0, 0, 5] as [number, number, number, number],
                            },
                            ...(data.notes ? [
                                { text: 'Observaciones:', style: 'label' },
                                { text: data.notes, style: 'value', margin: [0, 3, 0, 0] as [number, number, number, number] },   
                            ] : []),
                        ],
                    },
                    {
                        width: '45%',
                        stack: [
                            { text: 'Resumen', style: 'sectionTitle' },
                            {
                                table: {
                                    widths: ['*', 'auto'],
                                    body: [
                                        [{ text: 'Subtotal:', style: 'summaryLabel' }, { text: fCurrency(data.subtotal), style: 'summaryValue', alignment: 'right' }],
                                        [{ text: 'Descuento:', style: 'summaryLabel' }, { text: fCurrency(data.discount), style: 'summaryValue', alignment: 'right' }],
                                        [{ text: 'IVA (19%):', style: 'summaryLabel' }, { text: fCurrency(data.tax), style: 'summaryValue', alignment: 'right' }],
                                        [
                                            { text: 'TOTAL:', style: 'totalLabel' },
                                            { text: fCurrency(data.total), style: 'totalValue', alignment: 'right' },
                                        ],
                                    ],
                                },
                                layout: 'noBorders',
                            },
                        ],
                    },
                ],
            },
        ],
        styles: {
            header: { fontSize: 20, bold: true, color: '#1f2937' },
            receiptNumber: { fontSize: 11, color: '#6b7280' },
            date: { fontSize: 10, color: '#6b7280' },
            sectionTitle: { fontSize: 12, bold: true, color: '#374151', margin: [0, 10, 0, 8] },
            tableHeader: { bold: true, fontSize: 10, fillColor: '#f3f4f6', color: '#374151' },
            label: { fontSize: 9, bold: true, color: '#6b7280' },
            value: { fontSize: 9, color: '#1f2937' },
            summaryLabel: { fontSize: 10, color: '#374151' },
            summaryValue: { fontSize: 10, color: '#1f2937' },
            totalLabel: { fontSize: 12, bold: true, color: '#1f2937' },
            totalValue: { fontSize: 12, bold: true, color: '#16a34a' },
        },
        defaultStyle: { fontSize: 10, font: 'Roboto' },
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err) => reject(err));
        pdfDoc.end();
    });
};
