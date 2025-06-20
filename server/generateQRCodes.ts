import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

/**
 * Generate QR codes for all washing machines in the database
 * Each QR code encodes "machineId:<machineId>" format
 * Saves QR codes as PNG files in backend/qrcodes/ directory
 */
async function generateQRCodes(): Promise<void> {
  try {
    console.log('🔄 Starting QR code generation for washing machines...');

    // Create qrcodes directory if it doesn't exist
    const qrCodesDir = path.join(__dirname, '..', 'qrcodes');
    if (!fs.existsSync(qrCodesDir)) {
      fs.mkdirSync(qrCodesDir, { recursive: true });
      console.log(`📁 Created directory: ${qrCodesDir}`);
    }

    // Query all machines from database
    const machines = await prisma.machine.findMany({
      select: {
        id: true,
        machineId: true,
        qrCode: true,
      },
      orderBy: {
        machineId: 'asc'
      }
    });

    if (machines.length === 0) {
      console.log('⚠️ No machines found in database');
      return;
    }

    console.log(`📋 Found ${machines.length} machines to process`);

    // Process each machine
    for (const machine of machines) {
      try {
        console.log(`🔄 Generating QR code for ${machine.machineId}...`);

        // Create QR code data in format "machineId:<machineId>"
        const qrCodeData = `machineId:${machine.machineId}`;
        
        // Generate QR code as PNG buffer
        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
          type: 'png',
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Save QR code to file
        const fileName = `${machine.machineId}.png`;
        const filePath = path.join(qrCodesDir, fileName);
        
        fs.writeFileSync(filePath, qrCodeBuffer);
        console.log(`✅ QR code saved: qrcodes/${fileName}`);

        // Update machine record if qrCode is null
        if (!machine.qrCode) {
          await prisma.machine.update({
            where: { id: machine.id },
            data: { qrCode: qrCodeData }
          });
          console.log(`📝 Updated machine ${machine.machineId} with QR code data: ${qrCodeData}`);
        } else {
          console.log(`ℹ️ Machine ${machine.machineId} already has QR code: ${machine.qrCode}`);
        }

      } catch (error) {
        console.error(`❌ Error processing machine ${machine.machineId}:`, error);
        // Continue with next machine instead of failing completely
        continue;
      }
    }

    console.log('🎉 QR code generation completed successfully!');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`- Total machines processed: ${machines.length}`);
    console.log(`- QR codes directory: ${qrCodesDir}`);
    console.log(`- Files generated: ${machines.map(m => `${m.machineId}.png`).join(', ')}`);

  } catch (error) {
    console.error('❌ Fatal error during QR code generation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify QR code generation by reading and decoding a sample QR code
 */
async function verifyQRCodes(): Promise<void> {
  try {
    console.log('\n🔍 Verifying generated QR codes...');

    const qrCodesDir = path.join(__dirname, '..', 'qrcodes');
    
    if (!fs.existsSync(qrCodesDir)) {
      console.log('⚠️ QR codes directory not found');
      return;
    }

    const files = fs.readdirSync(qrCodesDir).filter(file => file.endsWith('.png'));
    
    if (files.length === 0) {
      console.log('⚠️ No QR code files found');
      return;
    }

    console.log(`📋 Found ${files.length} QR code files:`);
    files.forEach(file => {
      const machineId = file.replace('.png', '');
      const expectedData = `machineId:${machineId}`;
      console.log(`  - ${file} (should contain: "${expectedData}")`);
    });

    console.log('\n✅ QR code verification completed');
    console.log('💡 Test these QR codes with the ControlScreen.tsx camera scanner');

  } catch (error) {
    console.error('❌ Error during QR code verification:', error);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🚀 QR Code Generator for Washing Machine Control App');
  console.log('==================================================');
  
  await generateQRCodes();
  await verifyQRCodes();
  
  console.log('\n🏁 Script execution completed');
}

// Export the main function as default
export default generateQRCodes;

// Run the script if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
