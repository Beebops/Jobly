'use strict'

const db = require('../db')
const { BadRequestError, NotFoundError } = require('../expressError')
const { sqlForPartialUpdate } = require('../helpers/sql')

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    )

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`)

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    )
    const company = result.rows[0]

    return company
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
    )
    return companiesRes.rows
  }

  /**
   * Finds and retrieves a list of companies from the database based on optional filtering criteria.
   *
   * @param {number|null} minEmployees - The minimum number of employees a company should have (optional).
   * @param {number|null} maxEmployees - The maximum number of employees a company should have (optional).
   * @param {string|null} nameLike - A case-insensitive partial match for company names (optional).
   *
   * @throws {BadRequestError} If `minEmployees` is greater than `maxEmployees`.
   *
   * @returns {Array} An array of company objects that match the specified criteria.
   */

  static async findByFilters(minEmployees, maxEmployees, nameLike) {
    if (
      minEmployees &&
      maxEmployees &&
      parseInt(minEmployees) > parseInt(maxEmployees)
    ) {
      throw new BadRequestError(
        'min employees cannot be greater than max employees'
      )
    }

    let query = `SELECT * FROM companies WHERE 1 = 1`

    const queryParams = []

    if (minEmployees) {
      queryParams.push(minEmployees)
      query += ` AND num_employees >= $${queryParams.length}`
    }

    if (maxEmployees) {
      queryParams.push(maxEmployees)
      query += ` AND num_employees <= $${queryParams.length}`
    }

    if (nameLike) {
      queryParams.push(`%${nameLike.toLowerCase()}%`)
      query += ` AND LOWER(name) LIKE $${queryParams.length}`
    }

    const result = await db.query(query, queryParams)
    return result.rows
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    )

    const company = companyRes.rows[0]

    if (!company) throw new NotFoundError(`No company: ${handle}`)

    return company
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: 'num_employees',
      logoUrl: 'logo_url',
    })
    const handleVarIdx = '$' + (values.length + 1)

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`
    const result = await db.query(querySql, [...values, handle])
    const company = result.rows[0]

    if (!company) throw new NotFoundError(`No company: ${handle}`)

    return company
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    )
    const company = result.rows[0]

    if (!company) throw new NotFoundError(`No company: ${handle}`)
  }
}

module.exports = Company
