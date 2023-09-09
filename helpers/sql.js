const { BadRequestError } = require('../expressError')

/**
 * Generate SQL for a partial update of a database record.
 *
 * @param {Object} dataToUpdate - An object containing the data to be updated.
 * @param {Object} jsToSql - An object mapping JavaScript property names to their corresponding SQL column names.
 *
 * @returns {Object} An object containing the SQL set clause and parameter values.
 * @throws {BadRequestError} If `dataToUpdate` is empty.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate)
  if (keys.length === 0) throw new BadRequestError('No data')

  // maps over js property names and returns an array of corresponding SQL update clauses for each key
  //{firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  )

  return {
    setCols: cols.join(', '),
    values: Object.values(dataToUpdate),
  }
}

module.exports = { sqlForPartialUpdate }
