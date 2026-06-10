import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SegmentFilters {
  min_orders?: number;
  max_orders?: number;
  inactive_days?: number;
  min_spent?: number;
  max_spent?: number;
  city?: string;
  product_category?: string;
}

export async function buildPrismaQuery(filters: SegmentFilters): Promise<Prisma.CustomerWhereInput> {
  const where: Prisma.CustomerWhereInput = {};
  let targetCustomerIds: number[] | null = null;

  // Helper function to intersect customer ID lists
  const intersectCustomerIds = (ids: number[]) => {
    if (targetCustomerIds === null) {
      targetCustomerIds = ids;
    } else {
      targetCustomerIds = targetCustomerIds.filter(id => ids.includes(id));
    }
  };

  // 1. City filter (supports comma-separated list of cities)
  if (filters.city) {
    const cities = filters.city.split(',').map(c => c.trim()).filter(Boolean);
    if (cities.length > 0) {
      where.city = {
        in: cities,
        mode: 'insensitive'
      };
    }
  }

  // 2. Order counts (min_orders / max_orders) via groupBy on orders
  if (filters.min_orders !== undefined || filters.max_orders !== undefined) {
    const havingFilter: any = {};
    if (filters.min_orders !== undefined) {
      havingFilter.id = { _count: { gte: filters.min_orders } };
    }
    if (filters.max_orders !== undefined) {
      havingFilter.id = {
        ...(havingFilter.id || {}),
        _count: { ...(havingFilter.id?._count || {}), lte: filters.max_orders }
      };
    }

    const orderGroups = await prisma.order.groupBy({
      by: ['customerId'],
      _count: {
        id: true
      },
      having: havingFilter
    });

    intersectCustomerIds(orderGroups.map(g => g.customerId));
  }

  // 3. Inactivity (inactive_days)
  if (filters.inactive_days !== undefined) {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - filters.inactive_days);

    where.orders = {
      none: {
        orderedAt: {
          gte: cutOffDate
        }
      }
    };
  }

  // 4. Product category filter
  if (filters.product_category) {
    where.orders = {
      ...(where.orders as Record<string, any> || {}),
      some: {
        productCategory: {
          equals: filters.product_category,
          mode: 'insensitive'
        }
      }
    };
  }

  // 5. Total Spend filters (min_spent / max_spent)
  if (filters.min_spent !== undefined || filters.max_spent !== undefined) {
    const havingFilter: any = {};
    if (filters.min_spent !== undefined) {
      havingFilter.amount = { _sum: { gte: filters.min_spent } };
    }
    if (filters.max_spent !== undefined) {
      havingFilter.amount = {
        ...(havingFilter.amount || {}),
        _sum: { ...(havingFilter.amount?._sum || {}), lte: filters.max_spent }
      };
    }

    const spendGroups = await prisma.order.groupBy({
      by: ['customerId'],
      _sum: {
        amount: true
      },
      having: havingFilter
    });

    intersectCustomerIds(spendGroups.map(g => g.customerId));
  }

  // If any group-by filters matching customer IDs were applied, add them to the query
  if (targetCustomerIds !== null) {
    where.id = {
      in: targetCustomerIds
    };
  }

  return where;
}

export async function previewSegment(filters: SegmentFilters) {
  const where = await buildPrismaQuery(filters);
  const count = await prisma.customer.count({ where });
  const sample = await prisma.customer.findMany({
    where,
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      age: true
    }
  });

  return { count, sample };
}
