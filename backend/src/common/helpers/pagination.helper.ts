export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const itemsLimit = Number(limit) || 20;
  const currentPage = Number(page) || 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsLimit));
  
  return {
    success: true,
    data,
    meta: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: itemsLimit,
    },
  };
}

export async function paginatePrisma<T>(
  model: any,
  args: {
    where: any;
    include?: any;
    orderBy?: any;
  },
  pagination: {
    page?: number;
    limit?: number;
  }
) {
  const page = pagination.page ? Number(pagination.page) : undefined;
  const limit = pagination.limit ? Number(pagination.limit) : undefined;

  // If no pagination parameters, return raw array (backward compatibility for dropdowns)
  if (!page && !limit) {
    return model.findMany({
      where: args.where,
      include: args.include,
      orderBy: args.orderBy,
    });
  }

  const itemsLimit = limit || 20;
  const currentPage = page || 1;
  const skip = (currentPage - 1) * itemsLimit;

  // Prisma transactions are more reliable for parallel query counts
  const [data, totalItems] = await Promise.all([
    model.findMany({
      where: args.where,
      include: args.include,
      orderBy: args.orderBy,
      skip,
      take: itemsLimit,
    }),
    model.count({ where: args.where }),
  ]);

  return createPaginatedResponse(data, totalItems, currentPage, itemsLimit);
}
