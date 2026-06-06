const timeFormat = (minutes) => {
  if (typeof minutes !== "number" || minutes < 0) {
    return "0h 0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

export default timeFormat;
