import React from 'react';
import Chart from 'react-apexcharts';

// Helper function to generate range of dates
const getDateRange = (start, end) => {
  const range = [];
  const current = new Date(start);

  while (current <= end) {
    range.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return range;
};

const groupByDate = (userList) => {
  if (!userList || userList.length === 0) {
    return [];
  }

  // Sort userList by createdAt
  const sortedUserList = userList.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const start = new Date(sortedUserList[0].createdAt);
  const end = new Date();
  
  const dateRange = getDateRange(start, end);
  const formattedDates = dateRange.map(
    (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  );

  const grouped = formattedDates.reduce((acc, date) => {
    const usersOnDate = userList.filter((user) => {
      const userDate = new Date(user.createdAt);
      const userKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, '0')}-${String(
        userDate.getDate()
      ).padStart(2, '0')}`;
      return userKey === date;
    });

    acc[date] = usersOnDate.length;
    return acc;
  }, {});

  const sortedGrouped = Object.entries(grouped).sort(([a], [b]) => new Date(a) - new Date(b));

  return sortedGrouped;
};

const UserCountChart = ({ userList }) => {
  let sortedGroupedUsers = groupByDate(userList);

  // If no data, return null to prevent chart from rendering
  if (sortedGroupedUsers.length === 0) {
    return null;
  }

  // Cumulative sum of user counts
  let cumulativeCount = 0;
  sortedGroupedUsers = sortedGroupedUsers.map(([date, count]) => {
    cumulativeCount += count;
    return [date, cumulativeCount];
  });

  const dateArray = sortedGroupedUsers.map(([date]) => new Date(date).toLocaleDateString());
  const userCounts = sortedGroupedUsers.map(([_, count]) => count);

  console.log(userCounts);

  const options = {
    chart: {
      type: 'line',
      height: 350,
    },
    xaxis: {
      categories: dateArray,
      labels: {
        style: {
          colors: '#FFFFFF',
        },
      },
    },
    yaxis: {
      title: {
        text: 'User Count',
      },
      labels: {
        style: {
          colors: '#FFFFFF',
        },
      },
    },
    grid: {
      borderColor: '#606060',
    },
    theme: {
      mode: 'dark',
    },
    stroke: {
      show: true,
      curve: 'smooth',
      colors: ['#FEB019'],
    },
    markers: {
      size: 5,
      colors: ['#FEB019'],
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        gradientToColors: ['#FEB019'],
        shadeIntensity: 1,
        type: 'vertical',
        opacityFrom: 0.6,
        opacityTo: 0.8,
        stops: [0, 100],
      },
    },
  };

  const series = [
    {
      name: 'users',
      data: userCounts,
    },
  ];

  return <Chart options={options} series={series} type="line" height={350} />;
};

export default UserCountChart;
