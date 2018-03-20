const assert = require('assert')
const FhemApiReadingValuesRepository = require('../../../extension/lib/fhem-api/ReadingValuesRepository')

describe('FhemApiReadingValuesRepository', () => {
  describe('getDates', () => {
    it('should return the correct timestamp for a given fromTimestamp and toTimestamp on the same date', () => {
      const fhemApiReadingValuesRepository = new FhemApiReadingValuesRepository(null, null)
      assert.deepEqual([1518217200000], fhemApiReadingValuesRepository.getDates(1518295953907, 1518295953908))
    })

    it('should return the correct timestamp for a given fromTimestamp and toTimestamp when they are on a different date', () => {
      const fhemApiReadingValuesRepository = new FhemApiReadingValuesRepository(null, null)
      assert.deepEqual([1518130800000, 1518217200000], fhemApiReadingValuesRepository.getDates(1518130800001, 1518295953908))
    })
  })
})
