const MS_PER_DAY = 24 * 60 * 60 * 1000;

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return normalizeDate(next);
}

function daysBetween(start, end) {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / MS_PER_DAY);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonths(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getDate(), daysInMonth(targetYear, normalizedMonth));
  return new Date(targetYear, normalizedMonth, day);
}

function addYears(date, years) {
  return addMonths(date, years * 12);
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isMonthlyEvent(date, startDate) {
  const targetDay = Math.min(
    startDate.getDate(),
    daysInMonth(date.getFullYear(), date.getMonth())
  );
  return date.getDate() === targetDay;
}

function isWeeklyEvent(date, startDate) {
  return daysBetween(startDate, date) % 7 === 0;
}

function isEventDay(date, startDate, frequency) {
  if (frequency === "weekday") {
    return isWeekday(date);
  }
  if (frequency === "weekly") {
    return isWeeklyEvent(date, startDate);
  }
  return isMonthlyEvent(date, startDate);
}

function getEndDate(startDate, timeValue, timeUnit) {
  if (timeUnit === "weeks") {
    return addDays(startDate, timeValue * 7);
  }
  if (timeUnit === "months") {
    return addMonths(startDate, timeValue);
  }
  return addYears(startDate, timeValue);
}

function getCompoundAnchor(startDate, compoundFrequency) {
  if (compoundFrequency === "weekly") {
    return addDays(startDate, 7);
  }
  if (compoundFrequency === "monthly") {
    return addMonths(startDate, 1);
  }
  return startDate;
}

function applyInterest(balance, ratePerPeriod) {
  if (ratePerPeriod <= 0) {
    return balance;
  }
  return balance * (1 + ratePerPeriod / 100);
}

function simulateGrowth({
  startingAmount,
  annualRate,
  compoundFrequency,
  depositAmount,
  depositFrequency,
  timeValue,
  timeUnit,
}) {
  const startDate = normalizeDate(new Date());
  const endDate = getEndDate(startDate, timeValue, timeUnit);
  let balance = startingAmount;
  const compoundAnchor = getCompoundAnchor(startDate, compoundFrequency);

  const labels = [];
  const series = [];

  const recordPoint = (date) => {
    labels.push(date.toLocaleDateString());
    series.push(Number(balance.toFixed(2)));
  };

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (depositAmount > 0 && isEventDay(date, startDate, depositFrequency)) {
      balance += depositAmount;
    }

    if (isEventDay(date, compoundAnchor, compoundFrequency)) {
      balance = applyInterest(balance, annualRate);
    }

    recordPoint(date);
  }

  return {
    labels,
    series,
    finalBalance: balance,
    endDate,
  };
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildChart(ctx) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Balance",
          data: [],
          borderColor: "#2f6fed",
          backgroundColor: "rgba(47, 111, 237, 0.15)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          ticks: {
            callback: (value) => currencyFormatter.format(value),
          },
        },
      },
    },
  });
}

function updateUI(result, chart, finalBalanceEl, futureDateEl) {
  finalBalanceEl.textContent = currencyFormatter.format(result.finalBalance);
  futureDateEl.textContent = result.endDate.toLocaleDateString();

  chart.data.labels = result.labels;
  chart.data.datasets[0].data = result.series;
  chart.update();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("calc-form");
  const finalBalanceEl = document.getElementById("final-balance");
  const futureDateEl = document.getElementById("future-date");
  const chartEl = document.getElementById("balance-chart");
  const chart = buildChart(chartEl.getContext("2d"));

  const runCalc = () => {
    const startingAmount = Math.max(
      0,
      parseNumber(document.getElementById("starting-amount").value, 0)
    );
    const annualRate = Math.max(
      0,
      parseNumber(document.getElementById("annual-rate").value, 0)
    );
    const compoundFrequency = document.getElementById("compound-frequency").value;
    const depositAmount = Math.max(
      0,
      parseNumber(document.getElementById("deposit-amount").value, 0)
    );
    const depositFrequency = document.getElementById("deposit-frequency").value;
    const timeValue = Math.max(
      1,
      Math.floor(parseNumber(document.getElementById("time-value").value, 1))
    );
    const timeUnit = document.getElementById("time-unit").value;

    const result = simulateGrowth({
      startingAmount,
      annualRate,
      compoundFrequency,
      depositAmount,
      depositFrequency,
      timeValue,
      timeUnit,
    });

    updateUI(result, chart, finalBalanceEl, futureDateEl);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runCalc();
  });

  runCalc();
});
