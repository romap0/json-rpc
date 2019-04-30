const maxLength = 7;
const getRandomString = (size = 10) => (
  Math
    .random()
    .toString(36)
    .substring(2, 9)
    .substring(0, size)
    + (size > maxLength ? getRandomString(size - maxLength) : '')
);

module.exports = getRandomString;
