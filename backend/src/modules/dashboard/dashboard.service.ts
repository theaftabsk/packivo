import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    // 1. Raw Duplex Stock
    const rawDuplexAgg = await this.prisma.duplexStock.aggregate({
      where: { tenantId, type: 'RAW' },
      _sum: { qtySheets: true },
    });
    const rawDuplex = rawDuplexAgg._sum.qtySheets || 0;

    // 2. Printed Duplex Stock
    const printedDuplexAgg = await this.prisma.duplexStock.aggregate({
      where: { tenantId, type: 'PRINTED' },
      _sum: { qtySheets: true },
    });
    const printedDuplex = printedDuplexAgg._sum.qtySheets || 0;

    // 3. Finished Goods & Ply Stock
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, plyType: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const productIds = products.map((p) => p.id);

    const finishedStocks = await this.prisma.finishedGoodsStock.findMany({
      where: { productId: { in: productIds } },
    });

    let threePlyStock = 0;
    let fivePlyStock = 0;
    let finishedGoods = 0;
    const lowStockAlerts: any[] = [];

    for (const stock of finishedStocks) {
      const prod = productMap.get(stock.productId);
      if (prod) {
        if (prod.plyType === 'THREE_PLY') {
          threePlyStock += stock.totalStock;
        } else if (prod.plyType === 'FIVE_PLY') {
          fivePlyStock += stock.totalStock;
        }
        finishedGoods += stock.totalStock;

        // Stock alert threshold: less than 1000 units
        if (stock.totalStock < 1000) {
          lowStockAlerts.push({
            name: prod.name,
            stock: stock.totalStock,
            color:
              stock.totalStock === 0
                ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
          });
        }
      }
    }

    // 4. Sales & Dispatches
    const dispatchAgg = await this.prisma.dispatch.aggregate({
      where: { tenantId },
      _sum: { qtyDispatched: true },
    });
    const dispatchedThisMonth = dispatchAgg._sum.qtyDispatched || 0;

    // 5. Wastage
    const completedPrintJobs = await this.prisma.printJob.findMany({
      where: { tenantId, status: 'COMPLETED' },
      select: { issuedSheets: true, returnedSheets: true, plannedQty: true },
    });
    const wastage = completedPrintJobs.reduce((acc, job) => {
      const wasted = job.issuedSheets - job.returnedSheets - job.plannedQty;
      return acc + (wasted > 0 ? wasted : 0);
    }, 0);

    // 6. Recent Inwards
    const duplexPurchases = await this.prisma.duplexPurchase.findMany({
      where: { tenantId },
      include: { vendor: true },
      take: 5,
      orderBy: { purchaseDate: 'desc' },
    });

    const kraftPurchases = await this.prisma.kraftPurchase.findMany({
      where: { tenantId },
      include: { vendor: true },
      take: 5,
      orderBy: { purchaseDate: 'desc' },
    });

    const recentInwards: any[] = [];
    duplexPurchases.forEach((p) => {
      recentInwards.push({
        date: p.purchaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        vendor: p.vendor.vendorName,
        item: `${p.size} Duplex Sheet (${p.gsm} GSM)`,
        qty: `${p.quantitySheets.toLocaleString()} sheets`,
        type: 'Duplex',
        rawDate: p.purchaseDate,
      });
    });

    kraftPurchases.forEach((p) => {
      recentInwards.push({
        date: p.purchaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        vendor: p.vendor.vendorName,
        item: `${p.rollSize}" Kraft roll (${p.gsm} GSM)`,
        qty: `${p.weightKg.toLocaleString()} kg`,
        type: 'Kraft',
        rawDate: p.purchaseDate,
      });
    });

    // Sort combined inwards by date desc
    recentInwards.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    // 7. Recent Finished Box Sales
    const dispatches = await this.prisma.dispatch.findMany({
      where: { tenantId },
      include: { customer: true, product: true },
      take: 5,
      orderBy: { dispatchDate: 'desc' },
    });

    const recentSales = dispatches.map((d) => ({
      date: d.dispatchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      invoice: d.invoiceNo || 'N/A',
      customer: d.customer.customerName,
      product: d.product.name,
      qty: `${d.qtyDispatched.toLocaleString()} pcs`,
    }));

    return {
      stats: {
        rawDuplex,
        printedDuplex,
        threePlyStock,
        fivePlyStock,
        finishedGoods,
        dispatchedThisMonth,
        wastage,
      },
      lowStockAlerts,
      recentInwards: recentInwards.slice(0, 5),
      recentSales,
    };
  }
}
