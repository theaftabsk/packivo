const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Create pg pool & adapter
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding GIGANI ERP database via Javascript...');

  // 1. Delete existing records to allow re-runs
  await prisma.plan.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.dispatch.deleteMany({});
  await prisma.productionJob.deleteMany({});
  await prisma.finishedGoodsStock.deleteMany({});
  await prisma.kraftStock.deleteMany({});
  await prisma.kraftPurchase.deleteMany({});
  await prisma.printJob.deleteMany({});
  await prisma.duplexStock.deleteMany({});
  await prisma.duplexPurchase.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.factory.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 1b. Create default plans
  const planStarter = await prisma.plan.create({
    data: {
      name: 'STARTER',
      price: 2999,
      maxUsers: 5,
      maxFactories: 2,
      features: ['5 Users Limit', 'Basic ERP Modules', 'Limited monthly usage', 'Standard support'],
    },
  });
  const planProfessional = await prisma.plan.create({
    data: {
      name: 'PROFESSIONAL',
      price: 5999,
      maxUsers: 20,
      maxFactories: 5,
      features: ['20 Users Limit', 'Full ERP Modules', 'Reports & Analytics', 'Priority Support'],
    },
  });
  const planEnterprise = await prisma.plan.create({
    data: {
      name: 'ENTERPRISE',
      price: 11999,
      maxUsers: 9999,
      maxFactories: 9999,
      features: ['Unlimited Users', 'All Features', 'Priority Support', 'Custom Requirements'],
    },
  });
  console.log('Created SaaS plans');

  // 2. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Packivo Packaging Factory',
      subdomain: 'packivo',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      emailVerified: true,
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subscriptionStatus: 'PROFESSIONAL',
    },
  });
  console.log(`Created tenant: ${tenant.name}`);

  // 2b. Create Tenant Settings matching company details
  await prisma.setting.create({
    data: {
      tenantId: tenant.id,
      companyName: 'Packivo Packaging Factory',
      gstinNumber: '24XXXXXXXXXXXXX',
      factoryAddress: 'Plot 42, Industrial Area, Sector 5',
      formulaThreePly: 'T + (F * 1.5) + B',
      formulaFivePly: 'T + (F * 3.0) + B',
      lowStockThreshold: 100,
      enableWhatsApp: false,
    },
  });
  console.log('Created default settings matching company details');

  // 3. Create Factory
  const factory = await prisma.factory.create({
    data: {
      name: 'Main Box Plant',
      location: 'Plot 42, Industrial Area, Sector 5',
      tenantId: tenant.id,
    },
  });
  console.log(`Created factory: ${factory.name}`);

  // 4. Create User
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@packivo.com',
      name: 'Packivo Admin User',
      password: hashedPassword,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      factoryId: factory.id,
    },
  });
  console.log(`Created user: ${user.name}`);

  // 4b. Create Super Admin User
  const superAdminPassword = bcrypt.hashSync('admin123', 10);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@packivo.com',
      name: 'Global SaaS Owner',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log(`Created super admin: ${superAdmin.name}`);

  // 5a. Create Printers
  await prisma.printer.create({
    data: {
      printerCode: 'PRN-0001',
      name: 'Pinnacle Packaging',
      contactPerson: 'Vikas Jain',
      mobile: '9898056789',
      email: 'jobs@pinnacle.com',
      gstNumber: '24EEEEP567NE225',
      address: 'Plot 12, GIDC Sector 4',
      city: 'Umargam',
      state: 'Gujarat',
      remarks: 'Primary offset printer for carton jobs',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  await prisma.printer.create({
    data: {
      printerCode: 'PRN-0002',
      name: 'Rainbow Printers',
      contactPerson: 'Naresh Patel',
      mobile: '9825456789',
      email: 'print@rainbow.com',
      gstNumber: '24DDDP1234P1Z4',
      address: 'Unit 7, Industrial Estate',
      city: 'Umargam',
      state: 'Gujarat',
      remarks: 'Flexo printing specialist',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('Created printers');

  // 5. Create Vendors
  const vendorKushal = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0001',
      vendorName: 'KUSHAL SALES & AGENCIES PVT LTD',
      contactPerson: 'Kushal Shah',
      mobile: '9822012345',
      whatsapp: '9822012345',
      email: 'kushal@sales.com',
      gstNumber: '27AAACK1234F1Z1',
      suppliedMaterials: ['Kraft'],
      remarks: 'Primary Kraft Roll Supplier',
      tenantId: tenant.id,
    },
  });

  const vendorVardhaman = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0002',
      vendorName: 'VARDHAMAN PAPER MILLS',
      contactPerson: 'Vardhaman Jain',
      mobile: '9833012345',
      whatsapp: '9833012345',
      email: 'vardhaman@mills.com',
      gstNumber: '27AABCV5678F1Z2',
      suppliedMaterials: ['Kraft', 'Duplex'],
      remarks: 'Alternate Kraft Roll Supplier',
      tenantId: tenant.id,
    },
  });

  const vendorOffsetPrinters = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0003',
      vendorName: 'Offset Printers Pvt Ltd',
      contactPerson: 'Rohan Deshmukh',
      mobile: '9844012345',
      whatsapp: '9844012345',
      email: 'rohan@offset.com',
      gstNumber: '27AABCW1122F1Z3',
      suppliedMaterials: ['Printer'],
      remarks: 'Offset Printing Partner',
      tenantId: tenant.id,
    },
  });

  const vendorScreenMasters = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0004',
      vendorName: 'Screen Masters',
      contactPerson: 'Amit Patil',
      mobile: '9855012345',
      whatsapp: '9855012345',
      email: 'amit@screen.com',
      gstNumber: '27AABCX3344F1Z4',
      suppliedMaterials: ['Printer'],
      remarks: 'Screen Printing Specialist',
      tenantId: tenant.id,
    },
  });

  const vendorCoPack = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0005',
      vendorName: 'Co-pack Solutions',
      contactPerson: 'Surendra Gupta',
      mobile: '9866012345',
      whatsapp: '9866012345',
      email: 'surendra@copack.com',
      gstNumber: '27AABCY5566F1Z5',
      suppliedMaterials: ['Co-Vendor'],
      remarks: 'Outsourced packaging co-vendor',
      tenantId: tenant.id,
    },
  });

  const vendorPaperTrade = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0006',
      vendorName: 'Paper Trade Link',
      contactPerson: 'Karan Malhotra',
      mobile: '9811012345',
      whatsapp: '9811012345',
      email: 'karan@trade.com',
      gstNumber: '27AABCZ1133F1Z6',
      suppliedMaterials: ['Duplex'],
      remarks: 'Primary Duplex Sheet Supplier',
      tenantId: tenant.id,
    },
  });

  const vendorAmarPaper = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0007',
      vendorName: 'Amar Paper Co',
      contactPerson: 'Amar Shah',
      mobile: '9812012345',
      whatsapp: '9812012345',
      email: 'amar@paper.com',
      gstNumber: '27AABCA2244F1Z7',
      suppliedMaterials: ['Duplex'],
      remarks: 'Alternate Duplex Sheet Supplier',
      tenantId: tenant.id,
    },
  });
  console.log('Created vendors');

  // 6. Create Customers
  const customerAminFoods = await prisma.customer.create({
    data: {
      customerCode: 'CUS-0001',
      customerName: 'Amin Foods',
      contactPerson: 'Amin Zahidi',
      mobile: '9898078901',
      email: 'orders@aminfoods.com',
      gstNumber: '24BBBBC56786127',
      billingAddress: 'Amin Complex, GIDC, Vapi',
      shippingAddress: 'Amin Foods Warehousing, Bhiwandi',
      city: 'Vapi',
      state: 'Gujarat',
      remarks: 'Primary customer for date packaging',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  const customerJumani = await prisma.customer.create({
    data: {
      customerCode: 'CUS-0002',
      customerName: 'Jumani Implex',
      contactPerson: 'Sanjay Jumani',
      mobile: '9825678901',
      email: 'orders@jumani.com',
      gstNumber: '24FFFFC1234C1Z6',
      billingAddress: 'A-102, Jumani Tower, Ring Road',
      shippingAddress: '',
      city: 'Umargam',
      state: 'Gujarat',
      remarks: '',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  const customerMahraj = await prisma.customer.create({
    data: {
      customerCode: 'CUS-0003',
      customerName: 'Mahraj Foods',
      contactPerson: 'Mahraj Dev',
      mobile: '9904078901',
      email: 'auth@mahrajfoods.com',
      gstNumber: '27HHHC9882H1Z8',
      billingAddress: 'Mumbai APMC Market, Sector 12',
      shippingAddress: '',
      city: 'Palghar',
      state: 'Maharashtra',
      remarks: '',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('Created customers');
  // 7. Create Products
  const productPouchOuter = await prisma.product.create({
    data: {
      name: 'AMIN KIMIA DATES',
      customerId: customerAminFoods.id,
      boxSizeLength: 330.0,
      boxSizeWidth: 270.0,
      boxSizeHeight: 190.0,
      duplexSize: '36 x 25',
      kraftSize: '35.5 x 25',
      plyType: 'FIVE_PLY',
      printingDetails: 'Printed',
      printingMode: 'Offset',
      colorCount: 5,
      specialColorCode: 'kkyc',
      finishType: 'Gloss',
      finishSize: '34 x 24',
      ups: 1,
      
      // Carton GSM config
      cartonTopPaperType: 'Duplex',
      cartonTopPaperGsm: 230,
      cartonFlutingPaperType: 'Kraft',
      cartonFlutingPaperGsm: 140,
      cartonBackingPaperType: 'Kraft',
      cartonBackingPaperGsm: 140,
      
      // Partition Details
      hasPartition: true,
      partitionSize: '23 x 24',
      partitionPly: '3-ply',
      partitionUps: '2',
      partitionTopPaperType: 'Kraft',
      partitionTopPaperGsm: 100,
      partitionFlutingPaperType: 'Kraft',
      partitionFlutingPaperGsm: 100,
      partitionBackingPaperType: 'Kraft',
      partitionBackingPaperGsm: 100,
      
      remarks: 'Special requirements, board colors...',
      isActive: true,
      tenantId: tenant.id,
    },
  });

  const productCakeBox = await prisma.product.create({
    data: {
      name: 'Cake Box 1lb Premium Offset',
      customerId: customerJumani.id,
      boxSizeLength: 8.0,
      boxSizeWidth: 8.0,
      boxSizeHeight: 4.0,
      duplexSize: '20 x 15',
      kraftSize: '18 x 12',
      plyType: 'THREE_PLY',
      printingDetails: 'Printed',
      printingMode: 'Offset',
      colorCount: 4,
      finishType: 'Matt',
      finishSize: '19 x 14',
      ups: 2,
      
      // Carton GSM config
      cartonTopPaperType: 'Duplex',
      cartonTopPaperGsm: 250,
      cartonFlutingPaperType: 'Kraft',
      cartonFlutingPaperGsm: 120,
      cartonBackingPaperType: 'Kraft',
      cartonBackingPaperGsm: 120,
      
      hasPartition: false,
      remarks: 'Standard premium packaging.',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('Created products');

  // 8. Create Duplex Stock
  // Raw duplex stock levels
  await prisma.duplexStock.create({
    data: {
      gsm: 230,
      size: '34 x 25',
      qtySheets: 5000,
      type: 'RAW',
      tenantId: tenant.id,
    },
  });

  await prisma.duplexStock.create({
    data: {
      gsm: 285,
      size: '36 x 25',
      qtySheets: 3000,
      type: 'RAW',
      tenantId: tenant.id,
    },
  });

  await prisma.duplexStock.create({
    data: {
      gsm: 250,
      size: '32 x 36',
      qtySheets: 0, // 1000 purchased, 1000 issued (w/ 200 printed returned)
      type: 'RAW',
      tenantId: tenant.id,
    },
  });

  await prisma.duplexStock.create({
    data: {
      gsm: 250,
      size: '32 x 36',
      qtySheets: 200,
      type: 'PRINTED',
      tenantId: tenant.id,
    },
  });

  await prisma.duplexStock.create({
    data: {
      gsm: 230,
      size: '38 x 29',
      qtySheets: 490, // 10000 purchased, 9510 issued
      type: 'RAW',
      tenantId: tenant.id,
    },
  });

  await prisma.duplexStock.create({
    data: {
      gsm: 230,
      size: '38 x 29',
      qtySheets: 1000,
      type: 'PRINTED',
      tenantId: tenant.id,
    },
  });

  console.log('Created duplex stock levels');

  // 9. Create Kraft Stock
  await prisma.kraftStock.create({
    data: {
      rollSize: 35.5,
      gsm: 140,
      weightKg: 2450.0,
      tenantId: tenant.id,
    },
  });

  await prisma.kraftStock.create({
    data: {
      rollSize: 18.0,
      gsm: 120,
      weightKg: 1050.0,
      tenantId: tenant.id,
    },
  });
  console.log('Created kraft roll stock levels');

  // 10. Create Duplex Purchases
  // Kushal Sales: K-110 (22 Jun 2026)
  await prisma.duplexPurchase.create({
    data: {
      vendorId: vendorKushal.id,
      challanNo: 'K-110',
      gsm: 230,
      size: '34 x 25',
      quantitySheets: 5000,
      weightKg: 630.65,
      rate: 15.5,
      deliveredTo: 'Pinnacle Packaging',
      remarks: 'Inward for AMIN KIMIA DATES size 34x25',
      purchaseDate: new Date('2026-06-22'),
      tenantId: tenant.id,
    },
  });

  await prisma.duplexPurchase.create({
    data: {
      vendorId: vendorKushal.id,
      challanNo: 'K-110',
      gsm: 285,
      size: '36 x 25',
      quantitySheets: 3000,
      weightKg: 495.45,
      rate: 15.5,
      deliveredTo: 'Pinnacle Packaging',
      remarks: 'Inward for AMIN KIMIA DATES size 36x25',
      purchaseDate: new Date('2026-06-22'),
      tenantId: tenant.id,
    },
  });

  // Paper Trade Link: 762 (13 Jun 2026)
  await prisma.duplexPurchase.create({
    data: {
      vendorId: vendorPaperTrade.id,
      challanNo: '762',
      gsm: 250,
      size: '32 x 36',
      quantitySheets: 1000,
      weightKg: 250.0,
      rate: 16.0,
      deliveredTo: 'Rainbow Printers',
      remarks: 'Urgent board sheets',
      purchaseDate: new Date('2026-06-13'),
      tenantId: tenant.id,
    },
  });

  // Amar Paper Co: CH-9081 (01 Jun 2026)
  await prisma.duplexPurchase.create({
    data: {
      vendorId: vendorAmarPaper.id,
      challanNo: 'CH-9081',
      gsm: 230,
      size: '38 x 29',
      quantitySheets: 10000,
      weightKg: 1500.0,
      rate: 14.5,
      deliveredTo: 'Pinnacle Packaging',
      remarks: 'Standard stock purchase',
      purchaseDate: new Date('2026-06-01'),
      tenantId: tenant.id,
    },
  });

  // 11. Create Kraft Purchases
  await prisma.kraftPurchase.create({
    data: {
      vendorId: vendorKushal.id,
      challanNo: 'CH-8892',
      invoiceNo: 'INV-2091',
      deliveredTo: 'GIGANI (Inhouse)',
      paperType: 'Natural',
      qtyRolls: 5,
      rollSize: 21.0,
      gsm: 120,
      weightKg: 609.68,
      rate: 42.0,
      remarks: 'COFFEE 100 GM',
      purchaseDate: new Date('2026-06-01'),
      tenantId: tenant.id,
    },
  });

  await prisma.kraftPurchase.create({
    data: {
      vendorId: vendorVardhaman.id,
      challanNo: 'CH-KFT-8092',
      invoiceNo: 'INV-KFT-3092',
      deliveredTo: 'GIGANI (Inhouse)',
      paperType: 'Natural',
      qtyRolls: 1,
      rollSize: 35.5,
      gsm: 140,
      weightKg: 2450.0,
      rate: 42.0,
      remarks: 'Backing kraft rolls standard',
      purchaseDate: new Date('2026-06-22'),
      tenantId: tenant.id,
    },
  });
  console.log('Created raw material purchases history');

  // 12. Create Finished Goods stock
  await prisma.finishedGoodsStock.create({
    data: {
      productId: productPouchOuter.id,
      totalStock: 800,
      allocatedStock: 200,
    },
  });

  await prisma.finishedGoodsStock.create({
    data: {
      productId: productCakeBox.id,
      totalStock: 1500,
      allocatedStock: 0,
    },
  });

  // 13. Create Dispatch history
  await prisma.dispatch.create({
    data: {
      invoiceNo: 'TMV-SALES-1001',
      challanNo: 'CH-DISP-0012',
      customerId: customerAminFoods.id,
      productId: productPouchOuter.id,
      qtyDispatched: 200,
      vehicleNo: 'MH-04-GP-8899',
      lrNo: 'LR-99881',
      transporterName: 'Express Logistics Group',
      dispatchDate: new Date('2026-06-08'),
      tenantId: tenant.id,
    },
  });

  // 14. Create Print Jobs to represent consumption
  // Print Job for Paper Trade Link challan (consuming 1000 sheets)
  await prisma.printJob.create({
    data: {
      jobNo: 'PJ-2026-102',
      productId: productCakeBox.id,
      printerId: vendorPaperTrade.id,
      plannedQty: 800,
      issuedSheets: 1000,
      returnedSheets: 200,
      availableStock: 200,
      status: 'COMPLETED',
      createdAt: new Date('2026-06-13T10:00:00Z'),
      tenantId: tenant.id,
    },
  });

  // Print Job for Amar Paper Co challan (consuming 9510 sheets total)
  await prisma.printJob.create({
    data: {
      jobNo: 'PJ-2026-103',
      productId: productPouchOuter.id,
      printerId: vendorAmarPaper.id,
      plannedQty: 8000,
      issuedSheets: 9510,
      returnedSheets: 1000,
      availableStock: 1000,
      status: 'COMPLETED',
      createdAt: new Date('2026-06-17T11:00:00Z'),
      tenantId: tenant.id,
    },
  });

  // 15. Create Audit Logs matching screenshot
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      timestamp: new Date('2026-06-22T07:01:08Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'ply_purchases',
        recordId: '2',
        oldValues: null,
        newValues: {
          challanNo: 'CH-8892',
          invoiceNo: 'INV-2091',
          qtyRolls: 5,
          weightKg: 609.68,
          rate: 42.0,
          deliveredTo: 'GIGANI (Inhouse)',
          remarks: 'COFFEE 100 GM'
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      timestamp: new Date('2026-06-22T07:01:08Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'ply_purchases',
        recordId: '3',
        oldValues: null,
        newValues: {
          challanNo: 'CH-KFT-8092',
          invoiceNo: 'INV-KFT-3092',
          qtyRolls: 1,
          weightKg: 2450.0,
          rate: 42.0,
          deliveredTo: 'GIGANI (Inhouse)',
          remarks: 'Backing kraft rolls standard'
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      timestamp: new Date('2026-06-22T06:54:25Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'duplex_purchases',
        recordId: '5',
        oldValues: null,
        newValues: {
          challanNo: 'K-110',
          gsm: 230,
          size: '34 x 25',
          quantitySheets: 5000,
          weightKg: 630.65,
          rate: 15.5
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      timestamp: new Date('2026-06-22T06:54:25Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'duplex_purchases',
        recordId: '6',
        oldValues: null,
        newValues: {
          challanNo: 'K-110',
          gsm: 285,
          size: '36 x 25',
          quantitySheets: 3000,
          weightKg: 495.45,
          rate: 15.5
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      timestamp: new Date('2026-06-22T06:52:35Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'products',
        recordId: '7',
        oldValues: null,
        newValues: {
          name: 'AMIN KIMIA DATES',
          boxSizeLength: 330.0,
          boxSizeWidth: 270.0,
          boxSizeHeight: 190.0,
          plyType: 'FIVE_PLY',
          colorCount: 5,
          cartonTopPaperType: 'Duplex',
          cartonTopPaperGsm: 230
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'UPDATE',
      timestamp: new Date('2026-06-22T06:49:51Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'customers',
        recordId: '2',
        oldValues: {
          contactPerson: 'Sanjay OldName',
          mobile: '9800000000'
        },
        newValues: {
          contactPerson: 'Sanjay Jumani',
          mobile: '9825678901'
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'UPDATE',
      timestamp: new Date('2026-06-22T06:48:09Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'vendors',
        recordId: '3',
        oldValues: {
          email: 'oldrohan@offset.com',
          contactPerson: 'Rohan Old'
        },
        newValues: {
          email: 'rohan@offset.com',
          contactPerson: 'Rohan Deshmukh'
        }
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'UPDATE',
      timestamp: new Date('2026-06-22T05:15:43Z'),
      tenantId: tenant.id,
      details: JSON.stringify({
        tableName: 'printers',
        recordId: '2',
        oldValues: {
          address: 'Old Address GIDC'
        },
        newValues: {
          address: 'Unit 7, Industrial Estate'
        }
      })
    }
  });

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
