import { Client, Project, User } from '@/types/generics';
import { Chimney, ObjectWithRelations } from '@/types/objectSpecific';
import { parseISO } from 'date-fns';
import * as Print from 'expo-print';

// Report 1
export const generateCleaningRecord = async (
  project: Project,
  user: User,
  client: Client,
  object: ObjectWithRelations,
  chimney: Chimney,
  watermarkBase64: string,
  footerImageBase64: string
) => {
  try {
    const isLegalEntity = client.type === "Právnicka osoba";
    
    const clientInfoRows = isLegalEntity
      ? `
          <p class="info-row"><span class="label">Názov právnickej osoby:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Sídlo právnickej osoby:</span> ${client.address}</p>
        `
      : `
          <p class="info-row"><span class="label">Meno a priezvisko fyzickej osoby - podnikateľa*:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Adresa trvalého pobytu fyzickej osoby - podnikateľa*:</span> ${client.address}</p>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 80px;
              position: relative;
            }

            .watermark-container {
              position: fixed;
              inset: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              pointer-events: none;
              z-index: 1;
            }

            .watermark {
              width: 70%;
              opacity: 0.05;
            }

            .header {
              margin-bottom: 30px;
            }

            .header-line{
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin-bottom: 5px;
            }
            
            .header-line2{
              font-size: 14px;
              margin-bottom: 5px;
            }

            h1 {
              text-align: center;
              color: #1e293b;
              font-size: 32px;
              margin-bottom: 5px;
              margin-top: 35px;
            }

            .report-detail{
              text-align: center;
              font-size: 14px;
            }

            .law-info{
              color: #64748b;
              font-size: 14px;
              margin-top: 20px;
            }

            /* INFO SECTION */
            .info-list {
              margin-top: 25px;
              margin-bottom: 40px;
            }

            .info-row {
              margin-bottom: 12px;
              font-size: 15px;
            }
            
            .info-row .label {
              font-weight: bold;
              color: #475569;
            }
            .info-issues{
              margin-top: 40px;
            }

            /* SIGNATURE */
            .signature-section {
              text-align: right;
              margin-top: 60px;
            }

            .signature-line {
              width: 330px;
              border-bottom: 2px dotted #1e293b;
              height: 35px;
              margin-left: auto;
            }

            .signature-label {
              color: #64748b;
              font-size: 12px;
              margin-top: 6px;
            }

            /* FOOTER */
            .footer {
              position: fixed;
              bottom: 30px;
              left: 80px;
              right: 80px;
              display: flex;
              gap: 20px;
              align-items: center;
              font-size: 11px;
              color: #64748b;
              background: white;
            }

            .footerImage {
              width: 120px;
              height: auto;
              flex-shrink: 0;
            }
            
            .footer > div{
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

          </style>
        </head>
        <body>
          <div class="watermark-container">
            <img src="${watermarkBase64}" class="watermark" />
          </div>

          <div class="header">
            <div class="header-line">
              <span>Číslo potvrdenia: _______________</span>
              <span>V: Čadci   Dňa: ${new Date().toLocaleDateString('sk-SK')}</span>
            </div>
            <div class="header-line">
              <span>Meno a priezvisko osoby, ktorá vykonala čistenie a kontrolu komína - dymovodu: ${user.name}</span>
            </div>
        
            <h1>POTVRDENIE</h1>
            <p class="report-detail">o vykonaní čistenia a kontroly komína alebo dymovodu*</p>

            <p class="law-info">
              podľa § 23 ods. 1 vyhlášky Ministerstva vnútra Slovenskej republiky č. 401/2007 Z.z. o 
              technických podmienkach a požiadavkách na protipožiarnu bezpečnosť pri inštalácii a 
              prevádzkovaní palivového spotrebiča, elektrotepelných spotrebičov a zariadení ústredného 
              vykurovania a pri výstavbe a používaní komína a dymovodu a o lehotách ich čistenia a 
              vykonávania kontrol v objekte právnickej osoby – fyzickej osoby – podnikateľa.*
            </p>
          </div>

          <!-- INFO LIST -->
          <div class="info-list">
            <p class="info-row"><span class="label">Adresa objektu:</span> ${object.object.address}</p>
            ${clientInfoRows}
            <p class="info-row"><span class="label">Označenie komína - dymovodu*:</span> ${chimney.chimney_type?.type} - ${chimney.chimney_type?.labelling}</p>
            <p class="info-row"><span class="label">Druh a typ spotrebiča:</span> ${chimney.appliance}</p>
            <p class="info-row"><span class="label">Dátum kontroly a čistenia:</span> ${project.start_date || new Date().toLocaleDateString('sk-SK')}</p>
            <div class="info-issues">
              <p class="info-row"><span class="label">Zistené nedostatky:</span> Neboli zistené nedostatky</p>
              <p class="info-row"><span class="label">Termín odstránenia nedostatkov:</span> ${project.start_date || '_______________'}</p>
            </div>          
          </div>

          <!-- SIGNATURE -->
          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="signature-label">Podpis osoby, ktorá vykonala čistenie a kontrolu komína - dymovodu*</div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <img src="${footerImageBase64}" class="footerImage" />
            <div>
              <span>* Nehodace sa prečiarknite</span>
              <span>
                Informácie o tom, ako bude osoba, ktorá Vám vydala toto potvrdenie spracúvať Vaše osobné údaje, 
                nájdete na www.kks-sr.sk alebo sú Vám k dispozícii k nahliadnutiu u tejto osoby
              </span>
            </div>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('Error generating cleaning record:', error);
    throw error;
  }
};


// Report 1 extended
export const generateCleaningWithPaymentRecord = async (
  project: Project,
  user: User,
  client: Client,
  object: ObjectWithRelations,
  chimney: Chimney,
  sums: string[],
  watermarkBase64: string,
  footerImageBase64: string
) => {
  try {
    const isLegalEntity = client.type === "Právnicka osoba";
    
    const clientInfoRows = isLegalEntity
      ? `
          <p class="info-row"><span class="label">Názov právnickej osoby:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Sídlo právnickej osoby:</span> ${client.address}</p>
        `
      : `
          <p class="info-row"><span class="label">Meno a priezvisko fyzickej osoby - podnikateľa*:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Adresa trvalého pobytu fyzickej osoby - podnikateľa*:</span> ${client.address}</p>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 80px;
              position: relative;
            }

            .watermark-container {
              position: fixed;
              inset: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              pointer-events: none;
              z-index: 1;
            }

            .watermark {
              width: 70%;
              opacity: 0.05;
            }

            .header {
              margin-bottom: 30px;
            }

            .header-line{
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin-bottom: 5px;
            }
            
            .header-line2{
              font-size: 14px;
              margin-bottom: 5px;
            }

            h1 {
              text-align: center;
              color: #1e293b;
              font-size: 32px;
              margin-bottom: 5px;
              margin-top: 35px;
            }

            .report-detail{
              text-align: center;
              font-size: 14px;
            }

            .law-info{
              color: #64748b;
              font-size: 14px;
              margin-top: 20px;
            }

            /* INFO SECTION */
            .info-list {
              margin-top: 25px;
              margin-bottom: 40px;
            }

            .info-row {
              margin-bottom: 12px;
              font-size: 15px;
            }
            
            .info-row .label {
              font-weight: bold;
              color: #475569;
            }
            .info-issues{
              margin-top: 40px;
            }

            /* SIGNATURE */
            .signature-section {
              text-align: right;
              margin-top: 60px;
            }

            .signature-line {
              width: 330px;
              border-bottom: 2px dotted #1e293b;
              height: 35px;
              margin-left: auto;
            }

            .signature-label {
              color: #64748b;
              font-size: 12px;
              margin-top: 6px;
            }

            /* FOOTER */
            .footer {
              position: fixed;
              bottom: 30px;
              left: 80px;
              right: 80px;
              display: flex;
              gap: 20px;
              align-items: center;
              font-size: 11px;
              color: #64748b;
              background: white;
            }

            .footerImage {
              width: 120px;
              height: auto;
              flex-shrink: 0;
            }
            
            .footer > div{
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            /* PAYMENT PAGE */
            .payment-page {
              padding-top: 40px;
            }

            .payment-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid #1e293b;
            }

            .payment-org strong,
            .payment-title strong {
              font-size: 16px;
              color: #1e293b;
            }

            .payment-org p,
            .payment-title p {
              font-size: 14px;
              color: #475569;
              margin-top: 5px;
            }

            .payment-title {
              text-align: right;
            }

            .payment-details {
              margin-bottom: 25px;
            }

            .payment-row {
              margin-bottom: 10px;
              font-size: 14px;
            }

            .dotted-line {
              border-bottom: 1px dotted #1e293b;
              display: inline-block;
              min-width: 150px;
            }

            /* TABLE */
            .payment-table {
              margin: 30px 0;
            }

            .payment-table table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #1e293b;
            }

            .payment-table th,
            .payment-table td {
              border: 1px solid #1e293b;
              padding: 12px;
              text-align: left;
              font-size: 14px;
            }

            .payment-table th {
              background-color: #f1f5f9;
              font-weight: bold;
              color: #1e293b;
            }

            .payment-table td {
              color: #475569;
            }

            .payment-purpose {
              margin: 30px 0;
            }

            .payment-signature {
              text-align: right;
              margin-top: 50px;
              margin-bottom: 40px;
            }

            .payment-contact {
              margin-top: 30px;
              font-size: 13px;
              color: #64748b;
            }

            .payment-contact p {
              margin-bottom: 5px;
            }

          </style>
        </head>
        <body>
          <div class="watermark-container">
            <img src="${watermarkBase64}" class="watermark" />
          </div>

          <div class="header">
            <div class="header-line">
              <span>Číslo potvrdenia: _______________</span>
              <span>V: Čadci   Dňa: ${new Date().toLocaleDateString('sk-SK')}</span>
            </div>
            <div class="header-line">
              <span>Meno a priezvisko osoby, ktorá vykonala čistenie a kontrolu komína - dymovodu: ${user.name}</span>
            </div>
        
            <h1>POTVRDENIE</h1>
            <p class="report-detail">o vykonaní čistenia a kontroly komína alebo dymovodu*</p>

            <p class="law-info">
              podľa § 23 ods. 1 vyhlášky Ministerstva vnútra Slovenskej republiky č. 401/2007 Z.z. o 
              technických podmienkach a požiadavkách na protipožiarnu bezpečnosť pri inštalácii a 
              prevádzkovaní palivového spotrebiča, elektrotepelných spotrebičov a zariadení ústredného 
              vykurovania a pri výstavbe a používaní komína a dymovodu a o lehotách ich čistenia a 
              vykonávania kontrol v objekte právnickej osoby – fyzickej osoby – podnikateľa.*
            </p>
          </div>

          <!-- INFO LIST -->
          <div class="info-list">
            <p class="info-row"><span class="label">Adresa objektu:</span> ${object.object.address}</p>
            ${clientInfoRows}
            <p class="info-row"><span class="label">Označenie komína - dymovodu*:</span> ${chimney.chimney_type?.type} - ${chimney.chimney_type?.labelling}</p>
            <p class="info-row"><span class="label">Druh a typ spotrebiča:</span> ${chimney.appliance}</p>
            <p class="info-row"><span class="label">Dátum kontroly a čistenia:</span> ${project.start_date || new Date().toLocaleDateString('sk-SK')}</p>
            <div class="info-issues">
              <p class="info-row"><span class="label">Zistené nedostatky:</span> Neboli zistené nedostatky</p>
              <p class="info-row"><span class="label">Termín odstránenia nedostatkov:</span> ${project.start_date ? parseISO(project.start_date).toLocaleDateString('sk-SK') : '_______________'}</p>
            </div>          
          </div>

          <!-- SIGNATURE -->
          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="signature-label">Podpis osoby, ktorá vykonala čistenie a kontrolu komína - dymovodu*</div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <img src="${footerImageBase64}" class="footerImage" />
            <div>
              <span>* Nehodace sa prečiarknite</span>
              <span>
                Informácie o tom, ako bude osoba, ktorá Vám vydala toto potvrdenie spracúvať Vaše osobné údaje, 
                nájdete na www.kks-sr.sk alebo sú Vám k dispozícii k nahliadnutiu u tejto osoby
              </span>
            </div>
          </div>
          
          <!-- SECOND PAGE -->
          <!-- PAGE BREAK -->
          <div style="page-break-before: always;"></div>

          <!-- PAYMENT RECEIPT PAGE -->
          <div class="payment-page">
            <div class="payment-header">
              <div class="payment-org">
                <strong>Organizácia</strong>
                <p>${user.name}</p>
              </div>
              <div class="payment-title">
                <strong>PRÍJMOVÝ</strong>
                <p>Pokladničný doklad</p>
              </div>
            </div>

            <div class="payment-details">
              <p class="payment-row">
                <span class="label">Pokladničný doklad číslo:</span> 
                <span class="dotted-line">_______________</span>
              </p>
              <p class="payment-row">
                <span class="label">zo dňa:</span> 
                <span>${new Date().toLocaleDateString('sk-SK')}</span>
              </p>
            </div>

            <div class="payment-table">
              <table>
                <thead>
                  <tr>
                    <th>Prijaté (od)</th>
                    <th>EUR</th>
                    <th>Číslo slovom</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${client.name}</td>
                    <td>${sums[0] || ''}</td>
                    <td>${sums[1] || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="payment-purpose">
              <p class="payment-row">
                <span class="label">Účel:</span> 
                <span>Čistenie a kontrola komína - dymovodu</span>
              </p>
              <p class="payment-row">
                <span class="label">Vyhotovil:</span> 
                <span>${user.name}</span>
              </p>
            </div>

            <div class="payment-signature">
              <div class="signature-line"></div>
              <div class="signature-label">Podpis</div>
            </div>

            <div class="payment-contact">
              <p>Kontakt: +421 902 707 744</p>
              <p>+421 41/433 33 12</p>
            </div>
          </div>

        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('Error generating extended cleaning record:', error);
    throw error;
  }
};

// Report 2
export const generateInspectionRecord = async (
  project: Project,
  client: Client,
  object: ObjectWithRelations,
  chimney: Chimney,
  watermarkBase64: string,
  footerImageBase64: string
) => {
  try {
    const isLegalEntity = client.type === "Právnicka osoba";

    const clientInfoRows = isLegalEntity
      ? `
          <p class="info-row"><span class="label">Názov právnickej osoby:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Sídlo právnickej osoby:</span> ${client.address}</p>
        `
      : `
          <p class="info-row"><span class="label">Meno a priezvisko fyzickej osoby - podnikateľa*:</span> ${client.name}</p>
          <p class="info-row"><span class="label">Adresa trvalého pobytu fyzickej osoby - podnikateľa*:</span> ${client.address}</p>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 80px;
              position: relative;
            }

            .watermark-container {
              position: fixed;
              inset: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              pointer-events: none;
              z-index: 1;
            }

            .watermark {
              width: 70%;
              opacity: 0.05;
            }

            .header {
              margin-bottom: 30px;
            }

            .header-line{
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin-bottom: 5px;
            }

            .header-line2{
              font-size: 14px;
              margin-bottom: 5px;
            }
            
            h1 {
              text-align: center;
              color: #1e293b;
              font-size: 32px;
              margin-bottom: 5px;
              margin-top: 35px;
            }

            .report-detail{
              text-align: center;
              font-size: 14px;
            }

            .law-info{
              color: #64748b;
              font-size: 14px;
              margin-top: 20px;
            }

            /* INFO SECTION */
            .info-list {
              margin-top: 25px;
              margin-bottom: 40px;
            }

            .info-row {
              margin-bottom: 12px;
              font-size: 15px;
            }
            
            .info-row .label {
              font-weight: bold;
              color: #475569;
            }
            
            .info-results {
              text-align: center;
              margin-top: 60px;
              margin-bottom: 60px;
            }

            .info-results-row{
              margin: 5px;
              font-weight: bold;
            }

            .info-issues{
              
            }

            /* SIGNATURE */
            .signature-section {
              text-align: right;
              margin-top: 60px;
            }

            .signature-line {
              width: 300px;
              border-bottom: 2px dotted #1e293b;
              height: 35px;
              margin-left: auto;
            }

            .signature-label {
              color: #64748b;
              font-size: 12px;
              margin-top: 6px;
            }

            /* FOOTER */
            .footer {
              position: fixed;
              bottom: 30px;
              left: 80px;
              right: 80px;
              display: flex;
              gap: 20px;
              align-items: center;
              font-size: 11px;
              color: #64748b;
              background: white;
            }

            .footerImage {
              width: 120px;
              height: auto;
              flex-shrink: 0;
            }
            
            .footer > div{
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
          </style>
        </head>
        <body>
          <div class="watermark-container">
            <img src="${watermarkBase64}" class="watermark" />
          </div>

          <div class="header">
            <div class="header-line">
              <span>Číslo potvrdenia: _______________</span>
              <span>V: Čadci   Dňa: ${new Date().toLocaleDateString('sk-SK')}</span>
            </div>

            <p class="header-line2">Meno a priezvisko osoby s odbornou spôsobilosťou, ktorá vykonala preskúšanie komína: Ing. Roman Klieštik </p>
            <p class="header-line2">Číslo osvedčenia o odbornej spôsobilosti podľa § 3a zákona č. 161/1998 Z.z.:  313/2024 </p>

            <h1>POTVRDENIE</h1>
            <p class="report-detail">o vykonaní preskúšania komína</p>

            <p class="law-info">
              podľa § 23 ods. 4 vyhlášky Ministerstva vnútra Slovenskej republiky č. 401/2007 Z.z. o 
              technických podmienkach a požiadavkách na protipožiarnu bezpečnosť pri inštalácii a prevádzkovaní 
              palivového spotrebiča, elektrotepelných spotrebičov a zariadení ústredného vykurovania a pri 
              výstavbe a používaní komína a dymovodu a o lehotách ich čistenia a vykonávania kontrol v objekte 
              právnickej osoby – fyzickej osoby – podnikateľa.*
            </p>
          </div>

          <!-- INFO LIST -->
          <div class="info-list">
            <p class="info-row"><span class="label">Adresa objektu:</span> ${object.object.address}</p>
            ${clientInfoRows}
            <p class="info-row"><span class="label">Umiestnenie pripojeného spotrebiča: </span> ${chimney.placement}</p>
            <p class="info-row"><span class="label">Druh a typ spotrebiča: </span> ${chimney.appliance}</p>
            <p class="info-row"><span class="label">Označenie komína - dymovodu*: </span>${chimney.chimney_type?.labelling}</p>
            <p class="info-row"><span class="label">Typ komína - dymovodu*: </span>${chimney.chimney_type?.type}</p>
            <p class="info-row"><span class="label">Dátum preskúšania komína: </span> ${project.start_date || new Date().toLocaleDateString('sk-SK')}</p>       
          </div>

          <div class="info-results">
              <p class="report-detail">Komín a dymovod</p>
              <p class="info-results-row">v y h o v u j ú   –   n e v y h o v u j ú</p>
              <p class="report-detail">z hľadiska bezpečnej a spoľahlivej prevádzky</p>
          </div>  
          
          <div class="info-issues">
              <p class="info-row"><span class="label">Zistené nedostatky:</span> Neboli zistené nedostatky</p>
              <p class="info-row"><span class="label">Termín odstránenia nedostatkov:</span> ${project.start_date ?  parseISO(project.start_date).toLocaleDateString('sk-SK'): '_______________'}</p>
              <p class="info-row"><span class="label">Prilohy:</span></p>
          </div>          
          
          <!-- SIGNATURE -->
          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="signature-label">Podpis a odtlačok pečiatky osoby s odbornou spôsobilosťou,</div>
            <div class="signature-label">ktorá vykonala preskúšanie komína</div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <img src="${footerImageBase64}" class="footerImage" />
            <div>
              <span>* Nehodace sa prečiarknite</span>
              <span>
                Informácie o tom, ako bude osoba, ktorá Vám vydala toto potvrdenie spracúvať Vaše osobné údaje, 
                nájdete na www.kks-sr.sk alebo sú Vám k dispozícii k nahliadnutiu u tejto osoby
              </span>
            </div>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('Error generating inspection record:', error);
    throw error;
  }
};

// Batch generation for all chimneys in a project
export const generateRecord = async(
  project: Project,
  user: User,
  client: Client,
  object: ObjectWithRelations,
  chimney: Chimney,
  watermarkBase64: string,
  footerImageBase64: string,
  recordType: "cleaning" | "inspection" | "cleaningWithPaymentReceipt",
  sums: string[] | null
): Promise<string | undefined> => {
  try {
    let uri: string;
    if (recordType === "cleaning" ) {
      uri = await generateCleaningRecord(
        project,
        user,
        client,
        object,
        chimney,
        watermarkBase64,
        footerImageBase64
      );
    } 
    else if (recordType === "inspection") {
      uri = await generateInspectionRecord(
        project,
        client,
        object,
        chimney,
        watermarkBase64,
        footerImageBase64
      );
    }
    else  {
      uri = await generateCleaningWithPaymentRecord(
        project,
        user,
        client,
        object,
        chimney,
        sums || [],
        watermarkBase64,
        footerImageBase64
      );
    }
    return uri;
  } catch (error) {
    console.error(`Error generating record for chimney ${chimney.id}:`, error);
    return undefined;
  }
};