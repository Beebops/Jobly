const { BadRequestError } = require('../expressError')
const { sqlForPartialUpdate } = require('./sql')

describe('sqlForPartialUpdate', function () {
  test('generate SQL for partial update and return obj with setCols and values', function () {
    const dataToUpdate = { firstName: 'Miss', lastName: 'Kitty' }
    const jsToSql = { firstName: 'first_name', lastName: 'last_name' }

    const result = sqlForPartialUpdate(dataToUpdate, jsToSql)

    expect(result).toEqual({
      setCols: '"first_name"=$1, "last_name"=$2',
      values: ['Miss', 'Kitty'],
    })
  })

  test('handles an empty dataToUpdate obj and throws BadRequestError', () => {
    const dataToUpdate = {}
    const jsToSql = { firstName: 'first_name' }

    const testFunction = () => {
      sqlForPartialUpdate(dataToUpdate, jsToSql)
    }

    expect(testFunction).toThrow(BadRequestError)
  })
})
