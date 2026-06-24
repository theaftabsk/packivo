import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importData(tenantId: string, userId: string, module: string, batchId: string, items: any[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('No items provided for import.');
    }

    return this.prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const item of items) {
        if (module === 'vendor') {
          // Check duplicate code
          if (item.vendorCode) {
            const exists = await tx.vendor.findFirst({
              where: { tenantId, vendorCode: item.vendorCode },
            });
            if (exists) continue; // skip duplicates
          }
          const record = await tx.vendor.create({
            data: {
              vendorCode: item.vendorCode || `VND-${Math.floor(1000 + Math.random() * 9000)}`,
              vendorName: item.vendorName,
              contactPerson: item.contactPerson || null,
              mobile: item.mobile || null,
              whatsapp: item.whatsapp || null,
              email: item.email || null,
              gstNumber: item.gstNumber || null,
              suppliedMaterials: Array.isArray(item.suppliedMaterials)
                ? item.suppliedMaterials
                : item.suppliedMaterials
                ? String(item.suppliedMaterials).split(',').map((s: string) => s.trim())
                : [],
              remarks: item.remarks || null,
              tenantId,
            },
          });
          createdIds.push(record.id);

        } else if (module === 'customer') {
          if (item.customerCode) {
            const exists = await tx.customer.findFirst({
              where: { tenantId, customerCode: item.customerCode },
            });
            if (exists) continue;
          }
          const record = await tx.customer.create({
            data: {
              customerCode: item.customerCode || `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
              customerName: item.customerName,
              contactPerson: item.contactPerson || null,
              mobile: item.mobile || null,
              email: item.email || null,
              gstNumber: item.gstNumber || null,
              billingAddress: item.billingAddress || null,
              shippingAddress: item.shippingAddress || null,
              city: item.city || null,
              state: item.state || null,
              remarks: item.remarks || null,
              tenantId,
            },
          });
          createdIds.push(record.id);

        } else if (module === 'product') {
          const customerId = await this.resolveCustomerId(tx, tenantId, item.customerName || item.customerCode);
          if (!customerId) {
            throw new BadRequestException(`Customer '${item.customerName || item.customerCode || ''}' not found.`);
          }
          const record = await tx.product.create({
            data: {
              name: item.name,
              customerId,
              boxSizeLength: Number(item.boxSizeLength || 0),
              boxSizeWidth: Number(item.boxSizeWidth || 0),
              boxSizeHeight: Number(item.boxSizeHeight || 0),
              duplexSize: item.duplexSize || '—',
              kraftSize: item.kraftSize || '—',
              plyType: item.plyType === 'THREE_PLY' || String(item.plyType).includes('3') ? 'THREE_PLY' : 'FIVE_PLY',
              printingMode: item.printingMode || 'Offset',
              colorCount: Number(item.colorCount || 1),
              finishType: item.finishType || null,
              ups: Number(item.ups || 1),
              hasPartition: item.hasPartition === true || String(item.hasPartition).toLowerCase() === 'true' || String(item.hasPartition) === '1',
              remarks: item.remarks || null,
              tenantId,
            },
          });
          createdIds.push(record.id);

        } else if (module === 'duplexPurchase') {
          const vendorId = await this.resolveVendorId(tx, tenantId, item.vendorName || item.vendorCode);
          if (!vendorId) {
            throw new BadRequestException(`Vendor '${item.vendorName || item.vendorCode || ''}' not found.`);
          }
          const record = await tx.duplexPurchase.create({
            data: {
              vendorId,
              challanNo: item.challanNo,
              gsm: Number(item.gsm),
              size: item.size,
              quantitySheets: Number(item.quantitySheets),
              weightKg: Number(item.weightKg),
              rate: Number(item.rate || 0),
              purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
              deliveredTo: item.deliveredTo || null,
              remarks: item.remarks || null,
              tenantId,
            },
          });

          // Update RAW Duplex stock
          await tx.duplexStock.upsert({
            where: {
              gsm_size_type_tenantId: {
                gsm: Number(item.gsm),
                size: item.size,
                type: 'RAW',
                tenantId,
              },
            },
            create: {
              gsm: Number(item.gsm),
              size: item.size,
              type: 'RAW',
              qtySheets: Number(item.quantitySheets),
              tenantId,
            },
            update: {
              qtySheets: {
                increment: Number(item.quantitySheets),
              },
            },
          });

          createdIds.push(record.id);

        } else if (module === 'plyPurchase') {
          const vendorId = await this.resolveVendorId(tx, tenantId, item.vendorName || item.vendorCode);
          if (!vendorId) {
            throw new BadRequestException(`Vendor '${item.vendorName || item.vendorCode || ''}' not found.`);
          }
          const record = await tx.kraftPurchase.create({
            data: {
              vendorId,
              challanNo: item.challanNo || null,
              invoiceNo: item.invoiceNo || null,
              deliveredTo: item.deliveredTo || null,
              paperType: item.paperType || 'Natural',
              qtyRolls: Number(item.qtyRolls || 1),
              rollSize: Number(item.rollSize),
              gsm: Number(item.gsm),
              weightKg: Number(item.weightKg),
              rate: Number(item.rate || 0),
              remarks: item.remarks || null,
              purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
              tenantId,
            },
          });

          // Update Kraft roll stock
          await tx.kraftStock.upsert({
            where: {
              rollSize_gsm_tenantId: {
                rollSize: Number(item.rollSize),
                gsm: Number(item.gsm),
                tenantId,
              },
            },
            create: {
              rollSize: Number(item.rollSize),
              gsm: Number(item.gsm),
              weightKg: Number(item.weightKg),
              tenantId,
            },
            update: {
              weightKg: {
                increment: Number(item.weightKg),
              },
            },
          });

          createdIds.push(record.id);

        } else if (module === 'dispatch') {
          const customerId = await this.resolveCustomerId(tx, tenantId, item.customerName || item.customerCode);
          if (!customerId) {
            throw new BadRequestException(`Customer '${item.customerName || item.customerCode || ''}' not found.`);
          }
          const productId = await this.resolveProductId(tx, tenantId, item.productName);
          if (!productId) {
            throw new BadRequestException(`Product '${item.productName || ''}' not found.`);
          }

          // Check if dispatch challan is unique
          if (item.challanNo) {
            const exists = await tx.dispatch.findUnique({
              where: { challanNo: item.challanNo },
            });
            if (exists) {
              throw new BadRequestException(`Dispatch Challan '${item.challanNo}' already exists.`);
            }
          }

          const record = await tx.dispatch.create({
            data: {
              invoiceNo: item.invoiceNo || null,
              challanNo: item.challanNo || `CH-DISP-${Math.floor(100000 + Math.random() * 900000)}`,
              customerId,
              productId,
              qtyDispatched: Number(item.qtyDispatched),
              vehicleNo: item.vehicleNo || null,
              lrNo: item.lrNo || null,
              transporterName: item.transporterName || null,
              dispatchDate: item.dispatchDate ? new Date(item.dispatchDate) : new Date(),
              tenantId,
            },
          });

          // Deduct finished goods stock
          const stock = await tx.finishedGoodsStock.findUnique({
            where: { productId },
          });
          if (stock) {
            await tx.finishedGoodsStock.update({
              where: { productId },
              data: {
                totalStock: {
                  decrement: Number(item.qtyDispatched),
                },
              },
            });
          } else {
            await tx.finishedGoodsStock.create({
              data: {
                productId,
                totalStock: -Number(item.qtyDispatched),
              },
            });
          }

          createdIds.push(record.id);
        }
      }

      // Log this batch in Audit Log
      const auditLog = await tx.auditLog.create({
        data: {
          userId,
          action: 'IMPORT_BATCH',
          details: JSON.stringify({
            batchId,
            module,
            recordIds: createdIds,
            recordCount: createdIds.length,
          }),
          tenantId,
        },
      });

      return {
        batchId,
        recordCount: createdIds.length,
        auditLogId: auditLog.id,
      };
    });
  }

  // Lookups helper functions
  private async resolveCustomerId(tx: any, tenantId: string, value: string): Promise<string | null> {
    if (!value) return null;
    const cust = await tx.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { customerName: { equals: value, mode: 'insensitive' } },
          { customerCode: { equals: value, mode: 'insensitive' } },
        ],
      },
    });
    return cust ? cust.id : null;
  }

  private async resolveVendorId(tx: any, tenantId: string, value: string): Promise<string | null> {
    if (!value) return null;
    const vend = await tx.vendor.findFirst({
      where: {
        tenantId,
        OR: [
          { vendorName: { equals: value, mode: 'insensitive' } },
          { vendorCode: { equals: value, mode: 'insensitive' } },
        ],
      },
    });
    return vend ? vend.id : null;
  }

  private async resolveProductId(tx: any, tenantId: string, value: string): Promise<string | null> {
    if (!value) return null;
    const prod = await tx.product.findFirst({
      where: {
        tenantId,
        name: { equals: value, mode: 'insensitive' },
      },
    });
    return prod ? prod.id : null;
  }

  async getImportHistory(tenantId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: 'IMPORT_BATCH',
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async rollbackBatch(tenantId: string, auditLogId: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id: auditLogId },
    });

    if (!auditLog || auditLog.tenantId !== tenantId) {
      throw new NotFoundException('Import batch log not found.');
    }

    const details = JSON.parse(auditLog.details);
    const { module, recordIds } = details;

    if (!recordIds || recordIds.length === 0) {
      await this.prisma.auditLog.delete({ where: { id: auditLogId } });
      return { success: true, count: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      if (module === 'duplexPurchase') {
        // Adjust stock back (decrement DuplexStock)
        for (const id of recordIds) {
          const purchase = await tx.duplexPurchase.findUnique({ where: { id } });
          if (purchase) {
            await tx.duplexStock.update({
              where: {
                gsm_size_type_tenantId: {
                  gsm: purchase.gsm,
                  size: purchase.size,
                  type: 'RAW',
                  tenantId,
                },
              },
              data: {
                qtySheets: {
                  decrement: purchase.quantitySheets,
                },
              },
            });
          }
        }
        await tx.duplexPurchase.deleteMany({
          where: { id: { in: recordIds } },
        });

      } else if (module === 'plyPurchase') {
        // Adjust stock back (decrement KraftStock)
        for (const id of recordIds) {
          const purchase = await tx.kraftPurchase.findUnique({ where: { id } });
          if (purchase) {
            await tx.kraftStock.update({
              where: {
                rollSize_gsm_tenantId: {
                  rollSize: purchase.rollSize,
                  gsm: purchase.gsm,
                  tenantId,
                },
              },
              data: {
                weightKg: {
                  decrement: purchase.weightKg,
                },
              },
            });
          }
        }
        await tx.kraftPurchase.deleteMany({
          where: { id: { in: recordIds } },
        });

      } else if (module === 'dispatch') {
        // Re-increment finished goods stock
        for (const id of recordIds) {
          const disp = await tx.dispatch.findUnique({ where: { id } });
          if (disp) {
            await tx.finishedGoodsStock.update({
              where: { productId: disp.productId },
              data: {
                totalStock: {
                  increment: disp.qtyDispatched,
                },
              },
            });
          }
        }
        await tx.dispatch.deleteMany({
          where: { id: { in: recordIds } },
        });

      } else if (module === 'vendor') {
        await tx.vendor.deleteMany({
          where: { id: { in: recordIds } },
        });

      } else if (module === 'customer') {
        await tx.customer.deleteMany({
          where: { id: { in: recordIds } },
        });

      } else if (module === 'product') {
        await tx.product.deleteMany({
          where: { id: { in: recordIds } },
        });
      }

      await tx.auditLog.delete({
        where: { id: auditLogId },
      });

      return { success: true, count: recordIds.length };
    });
  }
}
