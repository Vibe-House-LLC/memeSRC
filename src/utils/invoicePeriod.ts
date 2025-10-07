export interface InvoiceLinePeriod {
  start?: number | null;
  end?: number | null;
}

export interface InvoiceLine {
  period?: InvoiceLinePeriod | null;
}

export interface InvoiceLike {
  period_start?: number | null;
  period_end?: number | null;
  lines?: {
    data?: Array<InvoiceLine | null> | null;
  } | null;
}

export interface InvoicePeriodRange {
  start: number | null;
  end: number | null;
}

const isValidPeriod = (period?: InvoiceLinePeriod | null): period is Required<InvoiceLinePeriod> => {
  return typeof period?.start === 'number' && typeof period?.end === 'number';
};

export const getInvoiceCoveragePeriod = (invoice?: InvoiceLike | null): InvoicePeriodRange => {
  if (!invoice) {
    return { start: null, end: null };
  }

  const linePeriods = invoice.lines?.data?.map((line) => line?.period).filter(isValidPeriod);

  if (linePeriods && linePeriods.length > 0) {
    const starts = linePeriods.map((period) => period.start);
    const ends = linePeriods.map((period) => period.end);

    return {
      start: Math.min(...starts),
      end: Math.max(...ends),
    };
  }

  return {
    start: typeof invoice.period_start === 'number' ? invoice.period_start : null,
    end: typeof invoice.period_end === 'number' ? invoice.period_end : null,
  };
};

export const formatInvoiceCoveragePeriod = (
  invoice?: InvoiceLike | null,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
  prefix = 'Period: '
): string => {
  const { start, end } = getInvoiceCoveragePeriod(invoice);

  if (typeof start !== 'number' || typeof end !== 'number') {
    return `${prefix}N/A`;
  }

  const formatter = new Intl.DateTimeFormat(locale, options);

  return `${prefix}${formatter.format(new Date(start * 1000))} - ${formatter.format(new Date(end * 1000))}`;
};
