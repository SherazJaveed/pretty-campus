/* ========================================
   PRETTY CAMPUS - GPA Calculator Engine v2
   Now uses PrettyAPI for real/mock data
   ======================================== */

var PrettyGPA = {

  gradePoints: {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  },

  percentToGrade: function(pct) {
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 67) return 'D+';
    if (pct >= 63) return 'D';
    if (pct >= 60) return 'D-';
    return 'F';
  },

  calculateGPA: function(courses) {
    var totalPoints = 0;
    var totalCredits = 0;
    courses.forEach(function(course) {
      var grade = course.letterGrade || PrettyGPA.percentToGrade(course.percentage);
      var points = PrettyGPA.gradePoints[grade] || 0;
      totalPoints += points * course.credits;
      totalCredits += course.credits;
    });
    if (totalCredits === 0) return 0;
    return Math.round((totalPoints / totalCredits) * 100) / 100;
  },

  finalNeeded: function(currentGrade, desiredGrade, finalWeight) {
    var needed = (desiredGrade - currentGrade * (1 - finalWeight / 100)) / (finalWeight / 100);
    return Math.round(needed * 100) / 100;
  },

  assignmentImpact: function(currentGrade, assignmentScore, assignmentWeight) {
    var newGrade = currentGrade * (1 - assignmentWeight / 100) + assignmentScore * (assignmentWeight / 100);
    return Math.round(newGrade * 100) / 100;
  },

  predictFinal: function(grades) {
    if (!grades || grades.length < 2) return grades && grades[0] ? grades[0] : 0;
    var n = grades.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i; sumY += grades[i]; sumXY += i * grades[i]; sumX2 += i * i;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;
    var predicted = slope * n + intercept;
    return Math.min(100, Math.max(0, Math.round(predicted * 100) / 100));
  },

  getGPAColor: function(gpa) {
    if (gpa >= 3.7) return '#10B981';
    if (gpa >= 3.0) return '#3B82F6';
    if (gpa >= 2.0) return '#F59E0B';
    return '#EF4444';
  },

  getGradeColor: function(pct) {
    if (pct >= 90) return '#10B981';
    if (pct >= 80) return '#3B82F6';
    if (pct >= 70) return '#F59E0B';
    return '#EF4444';
  },

  // Use PrettyAPI if available, otherwise return mock data
  getMockCourses: function() {
    if (typeof PrettyAPI !== 'undefined') {
      return PrettyAPI.getMockCourses();
    }
    return [
      { id: 1, name: 'CS 301', title: 'Data Structures & Algorithms', credits: 4, percentage: 92, color: '#7C3AED' },
      { id: 2, name: 'MATH 201', title: 'Linear Algebra', credits: 3, percentage: 85, color: '#059669' },
      { id: 3, name: 'ENG 101', title: 'English Composition', credits: 3, percentage: 78, color: '#F59E0B' },
      { id: 4, name: 'PHYS 150', title: 'Classical Mechanics', credits: 4, percentage: 88, color: '#EC4899' },
      { id: 5, name: 'HIST 220', title: 'World History', credits: 3, percentage: 95, color: '#3B82F6' }
    ];
  }
};
