import React from 'react'
import { Button, Box } from '@mui/material'

/**
 * Utility to filter & sort games (existing)…
 */
export function filterAndSortGames(games, {
  playerFilter = '',
  ratingFilter = 'all',
  dateFilter = 'all',
  formatFilter = 'all',
  savedFilter = 'all',
}) {
  let dateLimit = null
  if (dateFilter !== 'all') {
    const d = new Date()
    if (dateFilter === 'week')      d.setDate(d.getDate() - 7)
    else if (dateFilter === 'month') d.setMonth(d.getMonth() - 1)
    else if (dateFilter === 'year')  d.setFullYear(d.getFullYear() - 1)
    dateLimit = d.getTime()
  }

  const filtered = games.filter(g => {
    // player
    if (playerFilter) {
      const pf = playerFilter.toLowerCase()
      if (!g.player1.toLowerCase().includes(pf) &&
          !g.player2.toLowerCase().includes(pf)) {
        return false
      }
    }

    // rating
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'unknown') {
        if (g.rating != null) return false
      } else {
        const min = parseInt(ratingFilter.replace('+',''),10)
        if (g.rating == null || g.rating < min) return false
      }
    }

    // date
    if (dateLimit && g.ts < dateLimit) return false

    // format
    if (formatFilter !== 'all' && g.format !== formatFilter) return false

    // saved
    if (savedFilter === 'unsaved') {
      if (g.saved) return false
    }

    return true
  })

  return filtered
}

/**
 * A “Clear All” button you can drop next to your filters.
 * Props:
 *   onClear: () => void   — call to reset all filter state
 */
export function ClearFiltersButton({ onClear }) {
  return (
    <Box sx={{ textAlign: 'right', mb: 2 }}>
      <Button
        variant="outlined"
        color="secondary"
        onClick={onClear}
      >
        Clear All
      </Button>
    </Box>
  )
}