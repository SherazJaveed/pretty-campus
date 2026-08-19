/* ========================================
   PRETTY CAMPUS - Achievement Badges + XP System
   Duolingo-inspired gamification for Canvas
   Research-backed: 3-5 meaningful badges per tier,
   XP levels, streak tracking, celebration animations
   ======================================== */

(function() {
  'use strict';

  var BADGES = [
    { id: 'first-submit', name: 'First Steps', emoji: '🎯', desc: 'Complete your first assignment', xp: 50, tier: 'bronze' },
    { id: 'streak-3', name: 'On a Roll', emoji: '🔥', desc: '3-day submission streak', xp: 100, tier: 'bronze' },
    { id: 'streak-7', name: 'Week Warrior', emoji: '⚡', desc: '7-day submission streak', xp: 200, tier: 'silver' },
    { id: 'streak-14', name: 'Unstoppable', emoji: '💪', desc: '14-day submission streak', xp: 400, tier: 'gold' },
    { id: 'streak-30', name: 'Legend', emoji: '👑', desc: '30-day submission streak', xp: 1000, tier: 'platinum' },
    { id: 'perfect-score', name: 'Sharpshooter', emoji: '🎯', desc: 'Score 100% on any assignment', xp: 150, tier: 'silver' },
    { id: 'five-perfect', name: 'Perfectionist', emoji: '💎', desc: '5 perfect scores in a row', xp: 500, tier: 'gold' },
    { id: 'all-caught-up', name: 'All Caught Up', emoji: '✅', desc: 'Zero overdue assignments', xp: 100, tier: 'bronze' },
    { id: 'early-bird', name: 'Early Bird', emoji: '🌅', desc: 'Submit before 8 AM', xp: 75, tier: 'bronze' },
    { id: 'night-owl', name: 'Night Owl', emoji: '🦉', desc: 'Submit after midnight', xp: 75, tier: 'bronze' },
    { id: 'speed-demon', name: 'Speed Demon', emoji: '🏎️', desc: 'Submit 24+ hours early', xp: 100, tier: 'silver' },
    { id: 'bookworm', name: 'Bookworm', emoji: '📚', desc: 'Access 50+ course files', xp: 150, tier: 'silver' },
    { id: 'social-butterfly', name: 'Social Butterfly', emoji: '🦋', desc: 'Post in 10+ discussions', xp: 150, tier: 'silver' },
    { id: 'deans-list', name: "Dean's List", emoji: '⭐', desc: 'Maintain 3.5+ GPA', xp: 300, tier: 'gold' },
    { id: 'semester-survivor', name: 'Semester Survivor', emoji: '🎓', desc: 'Complete a full semester', xp: 500, tier: 'gold' },
    { id: 'gpa-master', name: 'GPA Master', emoji: '🏆', desc: 'Achieve 4.0 GPA', xp: 1000, tier: 'platinum' }
  ];

  var LEVELS = [
    { level: 1, xpNeeded: 0, title: 'Freshman' },
    { level: 2, xpNeeded: 100, title: 'Sophomore' },
    { level: 3, xpNeeded: 300, title: 'Junior' },
    { level: 4, xpNeeded: 600, title: 'Senior' },
    { level: 5, xpNeeded: 1000, title: 'Scholar' },
    { level: 6, xpNeeded: 1500, title: 'Honor Student' },
    { level: 7, xpNeeded: 2200, title: 'Dean\'s List' },
    { level: 8, xpNeeded: 3000, title: 'Valedictorian' },
    { level: 9, xpNeeded: 4000, title: 'Magna Cum Laude' },
    { level: 10, xpNeeded: 5500, title: 'Summa Cum Laude' }
  ];

  var TIER_COLORS = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#7C3AED'
  };

  function init() {
    if (document.getElementById('pc-achievements-panel')) return;

    chrome.storage.local.get(['pcBadges', 'pcXP', 'pcStreak', 'pcStreakDate'], function(data) {
      var earned = data.pcBadges || {};
      var xp = data.pcXP || 0;
      var streak = data.pcStreak || 0;

      // Auto-check some badges based on current state
      earned = checkAutoBadges(earned, streak, xp);

      // Save updated badges
      chrome.storage.local.set({ pcBadges: earned });

      // Create the achievements panel
      createPanel(earned, xp, streak);
    });
  }

  function checkAutoBadges(earned, streak, xp) {
    // Streak badges
    if (streak >= 3 && !earned['streak-3']) { earned['streak-3'] = Date.now(); }
    if (streak >= 7 && !earned['streak-7']) { earned['streak-7'] = Date.now(); }
    if (streak >= 14 && !earned['streak-14']) { earned['streak-14'] = Date.now(); }
    if (streak >= 30 && !earned['streak-30']) { earned['streak-30'] = Date.now(); }

    // For demo: auto-earn first-submit and all-caught-up
    if (!earned['first-submit']) { earned['first-submit'] = Date.now(); }
    if (!earned['all-caught-up']) { earned['all-caught-up'] = Date.now(); }
    if (!earned['night-owl']) { earned['night-owl'] = Date.now(); }

    return earned;
  }

  function getLevel(xp) {
    var level = LEVELS[0];
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpNeeded) {
        level = LEVELS[i];
        break;
      }
    }
    var nextLevel = LEVELS[Math.min(level.level, LEVELS.length - 1)];
    var progress = 0;
    if (nextLevel.xpNeeded > level.xpNeeded) {
      progress = ((xp - level.xpNeeded) / (nextLevel.xpNeeded - level.xpNeeded)) * 100;
    }
    return { current: level, next: nextLevel, progress: Math.min(100, Math.round(progress)) };
  }

  function createPanel(earned, xp, streak) {
    var levelInfo = getLevel(xp);
    var earnedCount = Object.keys(earned).length;
    var totalBadges = BADGES.length;

    var panel = document.createElement('div');
    panel.id = 'pc-achievements-panel';

    // Badge grid
    var badgesHTML = BADGES.map(function(badge) {
      var isEarned = earned[badge.id];
      var tierColor = TIER_COLORS[badge.tier];
      var earnedClass = isEarned ? 'pc-badge-earned' : 'pc-badge-locked';
      var earnedDate = isEarned ? new Date(isEarned).toLocaleDateString() : '';

      return '<div class="pc-badge-card ' + earnedClass + '" title="' + badge.desc + (earnedDate ? ' — Earned ' + earnedDate : '') + '">' +
        '<div class="pc-badge-emoji">' + badge.emoji + '</div>' +
        '<div class="pc-badge-name">' + badge.name + '</div>' +
        '<div class="pc-badge-xp" style="color:' + tierColor + '">' + (isEarned ? '+' + badge.xp + ' XP' : badge.tier) + '</div>' +
        (isEarned ? '<div class="pc-badge-check">&#10003;</div>' : '<div class="pc-badge-lock">&#128274;</div>') +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="pc-ach-container">' +
        '<div class="pc-ach-header">' +
          '<div class="pc-ach-title">Achievements</div>' +
          '<div class="pc-ach-toggle" id="pcAchToggle">&#9660;</div>' +
        '</div>' +

        '<div class="pc-ach-body" id="pcAchBody">' +
          // Level + XP bar
          '<div class="pc-ach-level">' +
            '<div class="pc-ach-level-info">' +
              '<span class="pc-ach-level-badge">Lvl ' + levelInfo.current.level + '</span>' +
              '<span class="pc-ach-level-title">' + levelInfo.current.title + '</span>' +
              '<span class="pc-ach-xp-count">' + xp + ' XP</span>' +
            '</div>' +
            '<div class="pc-ach-xp-bar">' +
              '<div class="pc-ach-xp-fill" style="width:' + levelInfo.progress + '%"></div>' +
            '</div>' +
            '<div class="pc-ach-xp-label">' + xp + ' / ' + levelInfo.next.xpNeeded + ' XP to ' + levelInfo.next.title + '</div>' +
          '</div>' +

          // Stats row
          '<div class="pc-ach-stats">' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">' + earnedCount + '/' + totalBadges + '</div><div class="pc-ach-stat-label">Badges</div></div>' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">&#128293; ' + streak + '</div><div class="pc-ach-stat-label">Streak</div></div>' +
            '<div class="pc-ach-stat"><div class="pc-ach-stat-val">' + levelInfo.current.level + '</div><div class="pc-ach-stat-label">Level</div></div>' +
          '</div>' +

          // Badge grid
          '<div class="pc-badge-grid">' + badgesHTML + '</div>' +

          // Semester progress
          '<div class="pc-semester-progress">' +
            '<div class="pc-semester-title">Semester Progress</div>' +
            '<div class="pc-semester-bar"><div class="pc-semester-fill" style="width:47%"></div></div>' +
            '<div class="pc-semester-label">47% Complete — Keep going!</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    // Insert after GPA widget or at top
    var gpaWidget = document.getElementById('pc-gpa-widget');
    if (gpaWidget && gpaWidget.nextSibling) {
      gpaWidget.parentNode.insertBefore(panel, gpaWidget.nextSibling);
    } else {
      var content = document.getElementById('content');
      if (content) {
        content.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    // Toggle
    var toggle = document.getElementById('pcAchToggle');
    var body = document.getElementById('pcAchBody');
    if (toggle && body) {
      toggle.addEventListener('click', function() {
        var visible = body.style.display !== 'none';
        body.style.display = visible ? 'none' : 'block';
        toggle.innerHTML = visible ? '&#9654;' : '&#9660;';
      });
    }
  }

  // Award a badge programmatically
  function awardBadge(badgeId) {
    chrome.storage.local.get(['pcBadges', 'pcXP'], function(data) {
      var earned = data.pcBadges || {};
      var xp = data.pcXP || 0;

      if (earned[badgeId]) return; // Already earned

      var badge = BADGES.find(function(b) { return b.id === badgeId; });
      if (!badge) return;

      earned[badgeId] = Date.now();
      xp += badge.xp;

      chrome.storage.local.set({ pcBadges: earned, pcXP: xp });

      // Show celebration
      showBadgeNotification(badge);
    });
  }

  function showBadgeNotification(badge) {
    var notif = document.createElement('div');
    notif.className = 'pc-badge-notif';
    notif.innerHTML =
      '<div class="pc-badge-notif-emoji">' + badge.emoji + '</div>' +
      '<div class="pc-badge-notif-text">' +
        '<div class="pc-badge-notif-title">Badge Earned!</div>' +
        '<div class="pc-badge-notif-name">' + badge.name + '</div>' +
        '<div class="pc-badge-notif-xp">+' + badge.xp + ' XP</div>' +
      '</div>';

    document.body.appendChild(notif);

    // Animate in
    setTimeout(function() { notif.classList.add('pc-badge-notif-show'); }, 100);

    // Remove after 4 seconds
    setTimeout(function() {
      notif.classList.remove('pc-badge-notif-show');
      setTimeout(function() { notif.remove(); }, 500);
    }, 4000);

    // Mini confetti
    showMiniConfetti();
  }

  function showMiniConfetti() {
    var colors = ['#7C3AED', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#FFD700'];
    for (var i = 0; i < 30; i++) {
      var conf = document.createElement('div');
      conf.style.cssText = 'position:fixed;width:6px;height:6px;background:' + colors[i % 6] +
        ';top:50%;left:50%;z-index:99999;border-radius:50%;pointer-events:none;' +
        'animation:pcConfettiBurst ' + (0.5 + Math.random() * 1.5) + 's ease-out forwards;' +
        '--x:' + (Math.random() * 200 - 100) + 'px;--y:' + (Math.random() * 200 - 100) + 'px;';
      document.body.appendChild(conf);
      setTimeout(function() { conf.remove(); }, 2500);
    }
  }

  // Make awardBadge available globally
  if (typeof window !== 'undefined') {
    window.PrettyBadges = {
      award: awardBadge,
      BADGES: BADGES,
      LEVELS: LEVELS
    };
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 800); });
  } else {
    setTimeout(init, 800);
  }

})();
