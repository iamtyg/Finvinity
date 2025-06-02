import { Asset } from '../types';
import { getMarketStatus } from './marketData';
import { calculatePortfolioAtDate } from './portfolioPerformance';

/**
 * Calculate today's performance based on market status:
 * - If market is OPEN: Current value - Value at market open today
 * - If market is CLOSED: Value at market close - Value at market open (full day change)
 */
export const calculateTodayPerformance = async (assets: Asset[]) => {
  if (assets.length === 0) {
    return {
      change: 0,
      changePercentage: 0,
      startValue: 0,
      currentValue: 0,
      isMarketOpen: false
    };
  }

  try {
    // Get current market status
    const marketStatus = await getMarketStatus();
    const isMarketOpen = marketStatus.isOpen;
    
    // Get current time in Eastern Time with validation
    const now = new Date();
    
    // Validate current date
    if (isNaN(now.getTime())) {
      throw new Error('Invalid current date');
    }
    
    const easternTime = getEasternTime(now);
    
    // Validate Eastern time conversion
    if (isNaN(easternTime.getTime())) {
      throw new Error('Invalid Eastern time conversion');
    }
    
    let currentValue: number;
    let previousCloseValue: number;
    
    if (isMarketOpen) {
      // Market is OPEN: Compare current value with previous market close
      const currentSnapshot = calculatePortfolioAtDate(assets, now);
      currentValue = currentSnapshot.totalValue;
      
      // Get previous trading day's close
      const previousTradingDay = getPreviousTradingDay(easternTime);
      
      // Validate previous trading day
      if (isNaN(previousTradingDay.getTime())) {
        throw new Error('Invalid previous trading day calculation');
      }
      
      const prevMarketClose = new Date(previousTradingDay);
      prevMarketClose.setHours(16, 0, 0, 0); // 4:00 PM ET close
      
      // Validate previous close time
      if (isNaN(prevMarketClose.getTime())) {
        throw new Error('Invalid previous market close time');
      }
      
      const prevCloseSnapshot = calculatePortfolioAtDate(assets, prevMarketClose);
      previousCloseValue = prevCloseSnapshot.totalValue;
      
    } else {
      // Market is CLOSED: Compare last close with previous close
      
      // Determine the last trading day based on current time
      let lastTradingDay: Date;
      const currentHour = easternTime.getHours();
      const currentDay = easternTime.getDay();
      
      if (currentDay >= 1 && currentDay <= 5 && currentHour >= 16) {
        // Weekday after market close - use today as last trading day
        lastTradingDay = new Date(easternTime);
      } else {
        // Weekend or before market open - use actual last trading day
        lastTradingDay = getLastTradingDay(easternTime);
      }
      
      // Validate last trading day
      if (isNaN(lastTradingDay.getTime())) {
        throw new Error('Invalid last trading day calculation');
      }
      
      // Get last market close
      const lastMarketClose = new Date(lastTradingDay);
      lastMarketClose.setHours(16, 0, 0, 0); // 4:00 PM ET close
      
      // Validate last close time
      if (isNaN(lastMarketClose.getTime())) {
        throw new Error('Invalid last market close time');
      }
      
      const lastCloseSnapshot = calculatePortfolioAtDate(assets, lastMarketClose);
      currentValue = lastCloseSnapshot.totalValue;
      
      // Get previous trading day's close (one day before last trading day)
      const previousTradingDay = getPreviousTradingDay(lastTradingDay);
      
      // Validate previous trading day
      if (isNaN(previousTradingDay.getTime())) {
        throw new Error('Invalid previous trading day calculation for closed market');
      }
      
      const prevMarketClose = new Date(previousTradingDay);
      prevMarketClose.setHours(16, 0, 0, 0); // 4:00 PM ET close
      
      // Validate previous close time
      if (isNaN(prevMarketClose.getTime())) {
        throw new Error('Invalid previous market close time for closed market');
      }
      
      const prevCloseSnapshot = calculatePortfolioAtDate(assets, prevMarketClose);
      previousCloseValue = prevCloseSnapshot.totalValue;
    }
    
    // Validate calculated values
    if (isNaN(currentValue) || isNaN(previousCloseValue)) {
      throw new Error('Invalid portfolio value calculations');
    }
    
    // Calculate change and percentage based on previous close
    const change = currentValue - previousCloseValue;
    const changePercentage = previousCloseValue > 0 ? (change / previousCloseValue) * 100 : 0;
    
    // Validate final calculations
    if (isNaN(change) || isNaN(changePercentage)) {
      throw new Error('Invalid change calculations');
    }
    
    return {
      change,
      changePercentage,
      startValue: previousCloseValue,
      currentValue,
      isMarketOpen,
      referenceTime: isMarketOpen ? 'Previous Market Close' : 'Last Trading Day Close'
    };
    
  } catch (error) {
    console.error('Error calculating today performance:', error);
    // Fallback to simple 1-day calculation
    return calculateFallbackTodayPerformance(assets);
  }
};

/**
 * Convert UTC time to Eastern Time (handles DST automatically)
 * Fixed to prevent RangeError: Date value out of bounds
 */
function getEasternTime(utcDate: Date): Date {
  try {
    // More reliable timezone conversion
    // Get the timezone offset for Eastern Time
    const easternOffset = getEasternTimeOffset(utcDate);
    
    // Create new date with proper offset
    const easternTime = new Date(utcDate.getTime() + easternOffset);
    
    // Validate the result
    if (isNaN(easternTime.getTime())) {
      console.warn('Invalid Eastern time calculation, using UTC');
      return utcDate;
    }
    
    return easternTime;
  } catch (error) {
    console.error('Error converting to Eastern time:', error);
    // Fallback to UTC if conversion fails
    return utcDate;
  }
}

/**
 * Get the Eastern Time offset in milliseconds
 * Handles EST (-5 hours) and EDT (-4 hours) automatically
 */
function getEasternTimeOffset(date: Date): number {
  try {
    // Simplified approach: Check if we're in DST period
    const year = date.getFullYear();
    
    // DST starts second Sunday in March, ends first Sunday in November
    const marchSecondSunday = new Date(year, 2, 14 - new Date(year, 2, 1).getDay());
    const novemberFirstSunday = new Date(year, 10, 7 - new Date(year, 10, 1).getDay());
    
    // Validate DST boundary dates
    if (isNaN(marchSecondSunday.getTime()) || isNaN(novemberFirstSunday.getTime())) {
      // Fallback to EST
      return -5 * 60 * 60 * 1000;
    }
    
    // Check if we're in DST period
    const isDST = date >= marchSecondSunday && date < novemberFirstSunday;
    
    // Return appropriate offset
    return isDST ? -4 * 60 * 60 * 1000 : -5 * 60 * 60 * 1000; // EDT : EST
  } catch (error) {
    console.error('Error calculating Eastern offset:', error);
    // Default to EST offset (-5 hours)
    return -5 * 60 * 60 * 1000;
  }
}

/**
 * Get the previous trading day (skips weekends)
 */
function getPreviousTradingDay(currentDate: Date): Date {
  try {
    // Validate input
    if (isNaN(currentDate.getTime())) {
      throw new Error('Invalid current date for previous trading day calculation');
    }
    
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    
    // Validate intermediate result
    if (isNaN(previousDay.getTime())) {
      throw new Error('Invalid previous day calculation');
    }
    
    // If it's Monday, go back to Friday
    if (previousDay.getDay() === 0) { // Sunday
      previousDay.setDate(previousDay.getDate() - 2);
    } else if (previousDay.getDay() === 6) { // Saturday
      previousDay.setDate(previousDay.getDate() - 1);
    }
    
    // Final validation
    if (isNaN(previousDay.getTime())) {
      throw new Error('Invalid final previous trading day');
    }
    
    return previousDay;
  } catch (error) {
    console.error('Error calculating previous trading day:', error);
    // Fallback: return yesterday
    const fallback = new Date(currentDate);
    fallback.setDate(fallback.getDate() - 1);
    return fallback;
  }
}

/**
 * Get the last trading day (for weekends/holidays)
 */
function getLastTradingDay(currentDate: Date): Date {
  try {
    // Validate input
    if (isNaN(currentDate.getTime())) {
      throw new Error('Invalid current date for last trading day calculation');
    }
    
    const lastTradingDay = new Date(currentDate);
    
    // If it's weekend, go back to Friday
    if (lastTradingDay.getDay() === 0) { // Sunday
      lastTradingDay.setDate(lastTradingDay.getDate() - 2);
    } else if (lastTradingDay.getDay() === 6) { // Saturday
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    } else {
      // Weekday - go back to previous trading day
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
      // If previous day was weekend, adjust
      if (lastTradingDay.getDay() === 0) { // Sunday
        lastTradingDay.setDate(lastTradingDay.getDate() - 2);
      } else if (lastTradingDay.getDay() === 6) { // Saturday
        lastTradingDay.setDate(lastTradingDay.getDate() - 1);
      }
    }
    
    // Validate result
    if (isNaN(lastTradingDay.getTime())) {
      throw new Error('Invalid last trading day calculation');
    }
    
    return lastTradingDay;
  } catch (error) {
    console.error('Error calculating last trading day:', error);
    // Fallback: return yesterday
    const fallback = new Date(currentDate);
    fallback.setDate(fallback.getDate() - 1);
    return fallback;
  }
}

/**
 * Fallback calculation if market status service fails
 */
function calculateFallbackTodayPerformance(assets: Asset[]) {
  const currentSnapshot = calculatePortfolioAtDate(assets, new Date());
  const yesterdaySnapshot = calculatePortfolioAtDate(assets, new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  const change = currentSnapshot.totalValue - yesterdaySnapshot.totalValue;
  const changePercentage = yesterdaySnapshot.totalValue > 0 ? (change / yesterdaySnapshot.totalValue) * 100 : 0;
  
  return {
    change,
    changePercentage,
    startValue: yesterdaySnapshot.totalValue,
    currentValue: currentSnapshot.totalValue,
    isMarketOpen: false
  };
}

/**
 * Get a human-readable description of what "Today" represents
 * (Kept for debugging/logging purposes, not used in UI)
 */
export const getTodayPerformanceDescription = async (): Promise<string> => {
  try {
    const marketStatus = await getMarketStatus();
    const easternTime = getEasternTime(new Date());
    
    if (marketStatus.isOpen) {
      return "Today's performance (since market open at 9:30 AM ET)";
    } else {
      if (easternTime.getHours() >= 16) {
        return "Today's performance (market open to close)";
      } else if (easternTime.getHours() < 9 || (easternTime.getHours() === 9 && easternTime.getMinutes() < 30)) {
        return "Previous trading day performance";
      } else {
        return "Last trading day performance";
      }
    }
  } catch (error) {
    console.error('Error getting today performance description:', error);
    return "Today's performance";
  }
}; 