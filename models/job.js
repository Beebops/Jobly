'use strict'

const db = require('../db')
const { NotFoundError } = require('../expressError')
const { sqlForPartialUpdate } = require('../helpers/sql')

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns  { title, salary, equity, company_handle }
   *
   * */

  static async create(data) {
    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [data.title, data.salary, data.equity, data.companyHandle]
    )
    const job = result.rows[0]
    return job
  }

  /** Find all jobs with an optional findByFilters.
   *
   * findByFilters(optional)
   * minSalary
   * hasEquity (returns true for jobs with equity > 0)
   * title (case-insensive partial matches)
   * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
   * */

  static async findAll({ minSalary, hasEquity, title } = {}) {
    const query = `SELECT j.id, j.title, j.salary, j.equity, j.company_handle AS "companyHandle", c.name AS "companyName"
    FROM jobs j
    LEFT JOIN companies AS c on c.handle = j.company_handle`

    let whereClauses = []
    let queryVals = []

    // generate the correct SQL statements for each of the search terms by adding them to the whereClauses and queryVals arrays

    if (minSalary !== undefined) {
      queryVals.push(minSalary)
      whereClauses.push(`salary >= $${queryVals.length}`)
    }

    if (hasEquity === true) {
      whereClauses.push(`equity > 0`)
    }

    if (title !== undefined) {
      queryVals.push(`%${title}%`)
      whereClauses.push(`title ILIKE $${queryVals.length}`)
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ')
    }

    query += ' ORDER BY title'
    const jobs = await db.query(query, queryVals)
    return jobs.rows
  }

  /** Given a job id, return data about that job.
   *
   * Returns { id, title, salary, equity, companyHandle, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobsResults = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE if = $1`,
      [id]
    )

    const job = jobsResults.rows[0]

    if (!job) throw new NotFoundError(`Could not find job ${id}`)

    const companiesResults = await db.query(
      `
    SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
    FROM companies
    WHERE handle = $1`,
      [job.companyHandle]
    )

    job.company = companiesResults.rows[0]

    return job
  }

  /** Updates a job's data with given data
   *
   * Can be a partial update; only updates the fields provided in the data object
   *
   * Data can include { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   **/

  static async update(id, data) {
    const { setCols, vals } = sqlForPartialUpdate(data, {})
    const idIndex = '$' + (vals.length + 1)
    const querySql = `UPDATE jobs
    SET ${setCols}
    WHERE id = ${idIndex}
    RETURNING id, title, salary, equity, company_handle AS "companyHandle"`

    const result = await db.query(querySql, [...vals, id])
    const job = result.rows[0]

    if (!job) throw new NotFoundError(`Could not find job ${id}`)

    return job
  }

  /** Delete a given job from db
   * return undefined
   *
   * throws NotFoundError if company does not exist
   */

  static async remove(id) {
    const result = await db.query(
      `DELETE
      FROM jobs
      WHERE id = $1
      RETURNING id`,
      [id]
    )
    const job = result.rows[0]
    if (!job) throw new NotFoundError(`Could not find ${id}`)
  }
}

module.exports = Job
