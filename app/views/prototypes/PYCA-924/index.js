const express = require('express')
const router = express.Router()

// Local dependencies
const countries = require('../../../data/location-autocomplete')

/**
 * Prototype index
 */
router.all('/', (req, res) => {
  req.session.data = {}
  res.render(`${__dirname}/views/index`, { isStart: true })
})

/**
 * Redirects to first question
 */
router.all('/claimant/questions', (req, res) => {
  return res.redirect('./questions/british-passport')
})

/**
 * Question: British passport?
 */
router.all('/:type/questions/british-passport', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // UK national
  if (submitted.ukNational === 'yes') {
    return res.redirect('./british-passport-today')
  }

  // Non-UK national
  if (submitted.ukNational === 'no') {
    return res.redirect('./refugee')
  }

  res.render(`${__dirname}/views/questions/british-passport`)
})

/**
 * Question: Brought passport today?
 */
router.all('/:type/questions/british-passport-today', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Brought their passport
  if (submitted.passportToday === 'yes') {
    return res.redirect('./british-passport-nationality')
  }

  // Not brought their passport
  if (submitted.passportToday === 'no') {
    return res.redirect('../../outcome/END003')
  }

  res.render(`${__dirname}/views/questions/british-passport-today`)
})

/**
 * Question: Is passport nationality British?
 */
router.all('/:type/questions/british-passport-nationality', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]
  const saved = req.session.data[type]

  // British citizen
  if (submitted.britishCitizen === 'yes') {
    saved.nationality = 'country:GB'
    return res.redirect('./out-of-country')
  }

  // Not British citizen
  if (submitted.britishCitizen === 'no') {
    return res.redirect('../../outcome/END003')
  }

  res.render(`${__dirname}/views/questions/british-passport-nationality`)
})

/**
 * Question: Have they been out of the country?
 */
router.all('/:type/questions/out-of-country', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Out of country?
  if (submitted.outOfCountryMoreThan4Weeks === 'yes') {
    return res.redirect('./out-of-country-back-six-months')
  }

  // Not out of country
  if (submitted.outOfCountryMoreThan4Weeks === 'no') {
    return res.redirect('../../outcome/END015')
  }

  res.render(`${__dirname}/views/questions/out-of-country`)
})

/**
 * Question: Have they been back for six months?
 */
router.all('/:type/questions/out-of-country-back-six-months', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Fast track any answer
  if (submitted.backSixMonths) {
    return res.redirect('../../outcome/END001')
  }

  res.render(`${__dirname}/views/questions/out-of-country-back-six-months`)
})

/**
 * Question: Is this person a refugee?
 */
router.all('/:type/questions/refugee', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Refugee?
  if (submitted.refugee === 'yes') {
    return res.redirect('./residence-permit')
  }

  // Not a refugee
  if (submitted.refugee === 'no') {
    return res.redirect('./nationality')
  }

  res.render(`${__dirname}/views/questions/refugee`)
})

/**
 * Question: Nationality?
 */
router.all('/:type/questions/nationality', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]
  const saved = req.session.data[type]

  // Saved data by type
  const claimant = req.session.data.claimant
  const partner = req.session.data.partner

  // Claimant submitted answers
  if (type === 'claimant' && submitted.nationality) {
    saved.britishCitizen = 'no'

    if (claimant.nationality === 'country:GB') {
      return res.redirect('./british-passport-today')
    }

    if (claimant.nationality === 'country:IE') {
      return res.redirect('../../outcome/END001')
    }

    if (claimant.isCESC || claimant.isECSMA) {
      return res.redirect('../../outcome/END003')
    }

    if (claimant.isEEA) {
      return res.redirect('./employment-status')
    }

    if (!claimant.isEEA) {
      return res.redirect('./residence-permit')
    }
  }

  // Partner submitted answers
  if (type === 'partner' && submitted.nationality) {
    // Claimant and partner from Isle of Man
    if (claimant.nationality === 'territory:IM' && partner.nationality === 'territory:IM') {
      return res.redirect('../../outcome/END012')
    }

    // Claimant is ill
    if (claimant.dontWorkReason === 'illness') {
      if (partner.nationality === 'country:GB') {
        return res.redirect('../../outcome/END012')
      }
    }

    // Claimant is unemployed
    if (claimant.dontWorkReason === 'other') {
      if (['country:IE', 'territory:IM'].includes(claimant.nationality)) {
        return res.redirect('../../outcome/END003')
      }
    }

    // Partner from UK, Ireland or Isle of Man
    if (['country:GB', 'country:IE', 'territory:IM'].includes(partner.nationality)) {
      return res.redirect('../../outcome/END003')
    }

    if (partner.isEEA) {
      return res.redirect('./employment-status')
    }

    return res.redirect('../../outcome/END003')
  }

  res.render(`${__dirname}/views/questions/nationality`, {
    items: countries.list(saved.nationality)
  })
})

/**
 * Question: Have they brought a residence permit?
 */
router.all('/:type/questions/residence-permit', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]
  const saved = req.session.data[type]

  // Refugee with permit
  if (submitted.brp === 'yes' && saved.refugee === 'yes') {
    return res.redirect('./residence-permit-refugee')
  }

  // Refugee without permit
  if (submitted.brp === 'no' && saved.refugee === 'yes') {
    return res.redirect('../../outcome/END008')
  }

  // Ignore answer if not refugee
  if (submitted.brp) {
    return res.redirect('./no-public-funds')
  }

  res.render(`${__dirname}/views/questions/residence-permit`)
})

/**
 * Question: Does the permit type state REFUGEE?
 */
router.all('/:type/questions/residence-permit-refugee', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Permit says refugee?
  if (submitted.permitTypeRefugee === 'yes') {
    return res.redirect('./residence-permit-expired')
  }

  // Permit doesn't say refugee
  if (submitted.permitTypeRefugee === 'no') {
    return res.redirect('./no-public-funds')
  }

  res.render(`${__dirname}/views/questions/residence-permit-refugee`)
})

/**
 * Question: Has the card expired?
 */
router.all('/:type/questions/residence-permit-expired', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Card expired?
  if (submitted.permitExpired === 'yes') {
    return res.redirect('../../outcome/END003')
  }

  // Card hasn't expired
  if (submitted.permitExpired === 'no') {
    return res.redirect('../../outcome/END018')
  }

  res.render(`${__dirname}/views/questions/residence-permit-expired`)
})

/**
 * Question: Visa says no public funds?
 */
router.all('/:type/questions/no-public-funds', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Visa says "no public funds"
  if (submitted.noPublicFunds === 'yes') {
    return res.redirect('../../outcome/END004')
  }

  // Visa doesn't say "no public funds"
  if (submitted.noPublicFunds === 'no') {
    return res.redirect('./family-member')
  }

  res.render(`${__dirname}/views/questions/no-public-funds`)
})

/**
 * Question: Does this person have a job?
 */
router.all('/:type/questions/employment-status', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Saved data by type
  const claimant = req.session.data.claimant

  // Not working
  if ((submitted.employmentStatus || []).includes('dontWork')) {
    return res.redirect('./employment-status-not-working')
  }

  // Self employed
  if ((submitted.employmentStatus || []).includes('selfEmployed')) {
    return res.redirect('../../outcome/END003')
  }

  // Employed
  if ((submitted.employmentStatus || []).includes('employed')) {
    if (type === 'partner' && claimant.isEEA) {
      return res.redirect('../../outcome/END012')
    }

    if (type === 'partner' && !claimant.isEEA) {
      return res.redirect('../../outcome/END013')
    }

    return res.redirect('../../outcome/END002')
  }

  res.render(`${__dirname}/views/questions/employment-status`)
})

/**
 * Question: Why aren’t they working?
 */
router.all('/:type/questions/employment-status-not-working', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Saved data by type
  const claimant = req.session.data.claimant

  // Not working because redundant
  if (submitted.dontWorkReason === 'redundant') {
    if (type === 'partner' && claimant.isEEA) {
      return res.redirect('../../outcome/END012')
    }

    if (type === 'partner' && !claimant.isEEA) {
      return res.redirect('../../outcome/END013')
    }

    return res.redirect('../../outcome/END010')
  }

  // Not working because ill
  if (submitted.dontWorkReason === 'illness') {
    return res.redirect('./employment-status-fit-note')
  }

  // Not working because of other reason
  if (submitted.dontWorkReason === 'other') {
    if (type === 'partner') {
      return res.redirect('../../outcome/END003')
    }

    return res.redirect('./married-or-civil-partner')
  }

  res.render(`${__dirname}/views/questions/employment-status-not-working`)
})

/**
 * Question: Have they had constant fit notes?
 */
router.all('/:type/questions/employment-status-fit-note', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Saved data by type
  const claimant = req.session.data.claimant

  if (submitted.fitNote === 'yes') {
    if (type === 'partner' && claimant.isEEA) {
      return res.redirect('../../outcome/END012')
    }

    if (type === 'partner' && !claimant.isEEA) {
      return res.redirect('../../outcome/END013')
    }

    return res.redirect('../../outcome/END011')
  }

  if (submitted.fitNote === 'no' || submitted.fitNote === 'dontKnow') {
    if (type === 'partner') {
      return res.redirect('../../outcome/END003')
    }

    return res.redirect('./married-or-civil-partner')
  }

  res.render(`${__dirname}/views/questions/employment-status-fit-note`)
})

/**
 * Question: Visa says family member?
 */
router.all('/:type/questions/family-member', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Visa says "family member"
  if (submitted.familyMember === 'yes') {
    if (type === 'partner') {
      return res.redirect('../../outcome/END003')
    }

    return res.redirect('./married-or-civil-partner')
  }

  // Visa doesn't say "family member"
  if (submitted.familyMember === 'no') {
    return res.redirect('../../outcome/END009')
  }

  res.render(`${__dirname}/views/questions/family-member`)
})

/**
 * Question: Married or civil partner?
 */
router.all('/:type/questions/married-or-civil-partner', (req, res) => {
  const type = req.params.type
  const submitted = req.body[type]

  // Married or civil partner?
  if (submitted.partner === 'yes') {
    return res.redirect('../../partner/questions/nationality')
  }

  // No partner
  if (submitted.partner === 'no') {
    return res.redirect('../../outcome/END003')
  }

  res.render(`${__dirname}/views/questions/married-or-civil-partner`)
})

/**
 * Outcome
 */
router.all('/outcome/:outcome', (req, res) => {
  res.render(`${__dirname}/views/outcomes/${req.params.outcome}`)
})

module.exports = router
