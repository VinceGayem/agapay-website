// ===== INIT =====
async function initDefaults() {
  try {
    const snap = await db.ref('agapay').once('value');
    const data = snap.val() || {};
    const defaults = {
      mentees: {},
      admin: DB.admin,
      feedback: {},
      posts: {},
      sessions: {},
      tasks: {},
      taskAnswers: {},
      loggedUsers: {},
      adminInvites: {},
      adminInvitedUsers: {}
    };
    for (const [key, val] of Object.entries(defaults)) {
      if (!data[key]) await db.ref('agapay/' + key).set(val);
    }
  } catch (e) {
    console.error('initDefaults error:', e);
  }
}

// ===== REALTIME LISTENERS =====
function setupListeners() {
  const keys = ['mentees', 'admin', 'feedback', 'posts', 'sessions', 'tasks', 'taskAnswers', 'loggedUsers', 'adminInvites', 'adminInvitedUsers'];
  keys.forEach(function(k) {
    db.ref('agapay/' + k).on('value', function(snap) {
      DB[k] = snap.val() || (k === 'admin' ? DB.admin : {});
      renderActiveViews(k);
    });
  }, function(err) {
    console.error('Listener error:', err);
  });
}

function renderActiveViews(changedKey) {
  try {
    var adminDash = document.getElementById('adminDashboard');
    var menteeDash = document.getElementById('menteeDashboard');

    if (adminDash && adminDash.classList.contains('active')) {
      if (changedKey === 'mentees' || changedKey === 'loggedUsers') renderMenteeList();
      if (changedKey === 'sessions') renderSessionsList();
      if (changedKey === 'tasks' || changedKey === 'taskAnswers') renderAdminTasks();
      if (changedKey === 'posts') renderAdminPosts();
      if (changedKey === 'feedback') renderAllFeedback();
      if (changedKey === 'adminInvites') renderPendingInvites();
      if (changedKey === 'posts' || changedKey === 'feedback') updateStats();
    }

    if (menteeDash && menteeDash.classList.contains('active')) {
      var u = JSON.parse(sessionStorage.getItem('agapayUser'));
      if (u && u.role === 'mentee') {
        if (changedKey === 'posts') renderMenteePosts();
        if (changedKey === 'tasks' || changedKey === 'taskAnswers') renderMenteeTasks();
        if (changedKey === 'feedback') renderMyFeedback();
        if (changedKey === 'sessions') updateMenteeStats(u.user);
      }
    }
  } catch (e) {
    console.error('renderActiveViews error:', e);
  }
}

// ===== AUTH =====
function handleGoogleLogin(response) {
  try {
    var payload = JSON.parse(atob(response.credential.split('.')[1]));
    var email = payload.email;
    var user = email.split('@')[0];

    db.ref('agapay/loggedUsers/' + user).set({
      user: user,
      name: payload.name,
      email: email,
      picture: payload.picture,
      role: 'mentee',
      registered: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      lastLogin: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    });

    sessionStorage.setItem('agapayUser', JSON.stringify({
      role: 'mentee',
      name: payload.name,
      user: user,
      email: email,
      picture: payload.picture
    }));

    showMenteeDashboard(payload.name, payload.picture);
  } catch (e) {
    console.error('Google login error:', e);
  }
}

function switchRole(r) {
  document.getElementById('btnMentee').classList.toggle('active', r === 'mentee');
  document.getElementById('btnAdmin').classList.toggle('active', r === 'admin');

  var menteeLogin = document.getElementById('menteeLogin');
  var adminLogin = document.getElementById('adminLogin');

  if (r === 'mentee') {
    adminLogin.style.opacity = '0';
    adminLogin.style.transform = 'translateY(10px)';
    setTimeout(function() {
      adminLogin.style.display = 'none';
      menteeLogin.style.display = 'block';
      menteeLogin.style.opacity = '0';
      menteeLogin.style.transform = 'translateY(10px)';
      requestAnimationFrame(function() {
        menteeLogin.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        menteeLogin.style.opacity = '1';
        menteeLogin.style.transform = 'translateY(0)';
      });
    }, 200);
  } else {
    menteeLogin.style.opacity = '0';
    menteeLogin.style.transform = 'translateY(10px)';
    setTimeout(function() {
      menteeLogin.style.display = 'none';
      adminLogin.style.display = 'block';
      adminLogin.style.opacity = '0';
      adminLogin.style.transform = 'translateY(10px)';
      requestAnimationFrame(function() {
        adminLogin.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        adminLogin.style.opacity = '1';
        adminLogin.style.transform = 'translateY(0)';
      });
    }, 200);
  }
}

var loginAttempts = { mentee: 0, admin: 0, lockUntil: 0 };

document.getElementById('menteeForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (Date.now() < loginAttempts.lockUntil) {
    var waitSec = Math.ceil((loginAttempts.lockUntil - Date.now()) / 1000);
    var err = document.getElementById('menteeError');
    err.textContent = 'Too many attempts. Wait ' + waitSec + 's.';
    err.style.display = 'block';
    return;
  }
  var u = document.getElementById('menteeUser').value.trim().toLowerCase();
  var p = document.getElementById('menteePass').value;
  var menteesObj = getDataObj('mentees');
  var m = Object.values(menteesObj).find(function(m) { return m.user === u && m.password === p; });

  if (m) {
    loginAttempts.mentee = 0;
    document.getElementById('menteeError').style.display = 'none';
    db.ref('agapay/loggedUsers/' + m.user).set({
      user: m.user, name: m.name, email: m.email || m.user + '@phinmaed.com',
      role: 'mentee', picture: null,
      registered: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      lastLogin: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    });
    sessionStorage.setItem('agapayUser', JSON.stringify({ role: 'mentee', name: m.name, user: m.user }));
    showMenteeDashboard(m.name);
  } else {
    loginAttempts.mentee++;
    var errEl = document.getElementById('menteeError');
    if (loginAttempts.mentee >= 5) {
      loginAttempts.lockUntil = Date.now() + 60000;
      errEl.textContent = 'Too many failed attempts. Locked for 60s.';
    } else {
      errEl.textContent = 'Wrong username or password. (' + (5 - loginAttempts.mentee) + ' tries left)';
    }
    errEl.style.display = 'block';
    document.getElementById('menteePass').value = '';
  }
});

document.getElementById('adminForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (Date.now() < loginAttempts.lockUntil) {
    var waitSec = Math.ceil((loginAttempts.lockUntil - Date.now()) / 1000);
    var err = document.getElementById('adminError');
    err.textContent = 'Too many attempts. Wait ' + waitSec + 's.';
    err.style.display = 'block';
    return;
  }
  var u = document.getElementById('adminUser').value.trim().toLowerCase();
  var p = document.getElementById('adminPass').value;
  var a = DB.admin || { user: 'admin', password: 'agapayadmin' };
  var invitedObj = getDataObj('adminInvitedUsers');
  var invitedAdmin = Object.values(invitedObj).find(function(x) { return x.user === u && x.password === p; });

  if ((u === a.user && p === a.password) || invitedAdmin) {
    loginAttempts.admin = 0;
    document.getElementById('adminError').style.display = 'none';
    var adminName = invitedAdmin ? invitedAdmin.name : 'Admin';
    sessionStorage.setItem('agapayUser', JSON.stringify({ role: 'admin', name: adminName }));
    showAdminDashboard();
  } else {
    loginAttempts.admin++;
    var errEl = document.getElementById('adminError');
    if (loginAttempts.admin >= 5) {
      loginAttempts.lockUntil = Date.now() + 60000;
      errEl.textContent = 'Too many failed attempts. Locked for 60s.';
    } else {
      errEl.textContent = 'Wrong username or password. (' + (5 - loginAttempts.admin) + ' tries left)';
    }
    errEl.style.display = 'block';
    document.getElementById('adminPass').value = '';
  }
});

// ===== DASHBOARDS =====
function showMenteeDashboard(name, picture) {
  document.getElementById('loginWrapper').classList.add('hidden');
  document.getElementById('menteeDashboard').classList.add('active');
  document.getElementById('menteeName').textContent = name;
  if (picture) {
    var header = document.querySelector('#menteeDashboard .dash-header h1');
    header.innerHTML = '<img src="' + picture + '" style="width:40px;height:40px;border-radius:50%;vertical-align:middle;margin-right:10px;">Welcome, <span id="menteeName">' + name + '</span>!';
  }
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  updateMenteeStats(user.user);
  renderMenteePosts();
  renderMenteeTasks();
  renderMyFeedback();
}

function showAdminDashboard() {
  document.getElementById('loginWrapper').classList.add('hidden');
  document.getElementById('adminDashboard').classList.add('active');
  loadAdminProfile();
  renderMenteeList();
  renderSessionsList();
  renderAdminTasks();
  renderAdminPosts();
  renderAllFeedback();
  updateStats();
}

function loadAdminProfile() {
  var a = DB.admin || {};
  document.getElementById('adminUsername').value = a.user || 'admin';
  document.getElementById('adminName').value = a.name || 'Admin';
  document.getElementById('adminEmail').value = a.email || '';
}

function logout() {
  sessionStorage.removeItem('agapayUser');
  document.getElementById('loginWrapper').classList.remove('hidden');
  document.getElementById('menteeDashboard').classList.remove('active');
  document.getElementById('adminDashboard').classList.remove('active');
  document.getElementById('menteeForm').reset();
  document.getElementById('adminForm').reset();
}

// ===== MOBILE MENU =====
function toggleMobileMenu(wrapperId, tabsId) {
  var wrapper = document.getElementById(wrapperId);
  var toggle = wrapper.querySelector('.mobile-menu-toggle');
  wrapper.classList.toggle('mobile-open');
  toggle.classList.toggle('active');
}

// ===== TAB NAVIGATION =====
function showTab(t) {
  document.querySelectorAll('#adminDashboard .admin-tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('#adminDashboard .tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.querySelector('[onclick="showTab(\'' + t + '\')"]').classList.add('active');
  document.getElementById('tab-' + t).classList.add('active');
  if (t === 'settings') renderPendingInvites();
  document.getElementById('adminTabsWrapper').classList.remove('mobile-open');
  document.getElementById('adminTabsWrapper').querySelector('.mobile-menu-toggle').classList.remove('active');
}

function showMenteeTab(t) {
  document.querySelectorAll('#menteeDashboard .admin-tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('#menteeDashboard .tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.querySelector('[onclick="showMenteeTab(\'' + t + '\')"]').classList.add('active');
  document.getElementById('mtab-' + t).classList.add('active');
  if (t === 'posts') renderMenteePosts();
  if (t === 'feedback') renderMyFeedback();
  document.getElementById('menteeTabsWrapper').classList.remove('mobile-open');
  document.getElementById('menteeTabsWrapper').querySelector('.mobile-menu-toggle').classList.remove('active');
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

// --- Posts ---
function createPost() {
  if (!Security.canSubmit('createPost', 3000)) return alert('Please wait before posting again.');
  var title = Security.sanitizeInput(document.getElementById('postTitle').value, 200);
  var body = Security.sanitizeInput(document.getElementById('postBody').value, 2000);
  var tag = document.getElementById('postTag').value;
  if (!title || !body) return alert('Please fill in all fields.');
  var id = Date.now();
  db.ref('agapay/posts/' + id).set({
    id: id, title: title, body: body, tag: tag,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    comments: {}
  });
  document.getElementById('postTitle').value = '';
  document.getElementById('postBody').value = '';
  showSaved('postCreated');
}

function renderAdminPosts() {
  var posts = getData('posts');
  var el = document.getElementById('adminPostsList');
  var no = document.getElementById('noAdminPosts');
  if (!posts.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';
  el.innerHTML = posts.map(function(p) {
    var comments = p.comments ? objToArr(p.comments) : [];
    return '<div class="post-item">' +
      '<div class="post-header"><div style="display:flex;gap:8px;align-items:center;">' +
      '<span class="post-date">' + p.date + '</span>' +
      '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:var(--gold);" onclick="editPost(\'' + p._key + '\')">&#9998;</button>' +
      '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:#ef4444;" onclick="deletePost(\'' + p._key + '\')">&#128465;</button>' +
      '</div></div>' +
      '<span class="post-tag tag-' + p.tag + '">' + getTagIcon(p.tag) + ' ' + capitalize(p.tag) + '</span>' +
      '<div class="post-title" id="post-title-' + p._key + '">' + p.title + '</div>' +
      '<div class="post-body" id="post-body-' + p._key + '">' + p.body + '</div>' +
      '<div id="post-edit-' + p._key + '" style="display:none;margin:15px 0;">' +
        '<input type="text" id="post-edit-title-' + p._key + '" value="' + escapeAttr(p.title) + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.95rem;font-family:inherit;background:var(--card-bg);color:var(--text);margin-bottom:8px;">' +
        '<textarea id="post-edit-body-' + p._key + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:80px;">' + escapeAttr(p.body) + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="btn btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="savePost(\'' + p._key + '\')">Save</button>' +
          '<button class="dash-logout" style="padding:6px 14px;font-size:0.8rem;" onclick="cancelEditPost(\'' + p._key + '\')">Cancel</button>' +
        '</div>' +
      '</div>' +
      '<div class="comments-section">' +
        '<div class="comments-header">&#128172; ' + comments.length + ' Comment' + (comments.length !== 1 ? 's' : '') + '</div>' +
        comments.map(function(c) {
          return '<div class="comment-item"><div class="comment-content">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<div class="comment-author">' + c.author + (c.role === 'admin' ? ' <span style="color:var(--gold);font-size:0.75rem;">(Admin)</span>' : '') + '</div>' +
              '<button style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:#ef4444;" onclick="deleteAdminComment(\'' + p._key + '\', \'' + c._key + '\')">&#128465;</button>' +
            '</div>' +
            '<div class="comment-text">' + c.text + '</div>' +
            '<div class="comment-time">' + c.time + '</div>' +
          '</div></div>';
        }).join('') +
        '<div class="comment-form">' +
          '<input type="text" id="adminComment-' + p._key + '" placeholder="Write a comment as admin...">' +
          '<button class="btn btn-primary" onclick="addComment(\'' + p._key + '\', \'admin\')">Reply</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function editPost(key) {
  document.getElementById('post-title-' + key).style.display = 'none';
  document.getElementById('post-body-' + key).style.display = 'none';
  document.getElementById('post-edit-' + key).style.display = 'block';
}

function cancelEditPost(key) {
  var p = DB.posts[key];
  if (!p) return;
  document.getElementById('post-edit-title-' + key).value = p.title;
  document.getElementById('post-edit-body-' + key).value = p.body;
  document.getElementById('post-title-' + key).style.display = 'block';
  document.getElementById('post-body-' + key).style.display = 'block';
  document.getElementById('post-edit-' + key).style.display = 'none';
}

function savePost(key) {
  var newTitle = document.getElementById('post-edit-title-' + key).value.trim();
  var newBody = document.getElementById('post-edit-body-' + key).value.trim();
  if (!newTitle || !newBody) return alert('Title and body cannot be empty.');
  db.ref('agapay/posts/' + key).update({ title: newTitle, body: newBody });
}

function deletePost(key) {
  if (!confirm('Delete this post and all comments?')) return;
  db.ref('agapay/posts/' + key).remove();
}

function deleteAdminComment(postKey, commentKey) {
  if (!confirm('Delete this comment?')) return;
  db.ref('agapay/posts/' + postKey + '/comments/' + commentKey).remove();
}

function addComment(postKey, role) {
  if (!Security.canSubmit('addComment-' + postKey, 2000)) return alert('Please wait before commenting again.');
  var inputId = (role === 'admin' ? 'adminComment-' : 'menteeComment-') + postKey;
  var input = document.getElementById(inputId);
  var text = Security.sanitizeInput(input.value, 2000);
  if (!text) return;
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  var commentKey = db.ref('agapay/posts/' + postKey + '/comments').push().key;
  db.ref('agapay/posts/' + postKey + '/comments/' + commentKey).set({
    author: Security.escapeHtml(user.name),
    user: user.user,
    role: role,
    text: text,
    time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  });
  input.value = '';
}

// --- Tasks ---
function createTask() {
  if (!Security.canSubmit('createTask', 3000)) return alert('Please wait before creating another task.');
  var title = Security.sanitizeInput(document.getElementById('taskTitle').value, 200);
  var desc = Security.sanitizeInput(document.getElementById('taskDesc').value, 2000);
  var deadlineDate = document.getElementById('taskDeadline').value;
  var deadlineTime = document.getElementById('taskDeadlineTime').value;
  if (!title || !desc || !deadlineDate || !deadlineTime) return alert('Please fill in all fields.');
  var deadline = deadlineDate + 'T' + deadlineTime;
  var deadlineFormatted = new Date(deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  var id = Date.now();
  db.ref('agapay/tasks/' + id).set({
    id: id, title: title, desc: desc, deadline: deadline, deadlineFormatted: deadlineFormatted,
    dateCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskDeadline').value = '';
  document.getElementById('taskDeadlineTime').value = '';
  showSaved('taskCreated');
}

function renderAdminTasks() {
  var tasks = getData('tasks');
  var taskAnswersObj = getDataObj('taskAnswers');
  var answers = Object.values(taskAnswersObj);
  var el = document.getElementById('adminTasksList');
  var no = document.getElementById('noAdminTasks');
  var loggedUsersObj = getDataObj('loggedUsers');
  var loggedUsersCount = Object.keys(loggedUsersObj).length;

  if (!tasks.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = tasks.map(function(t) {
    var taskAnswers = answers.filter(function(a) { return a.taskId === t.id; });
    var submitted = taskAnswers.length;
    var dueDate = t.deadline ? new Date(t.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline';

    return '<div class="post-item">' +
      '<div class="post-header"><div style="display:flex;gap:8px;align-items:center;">' +
        '<span class="post-date">Due: ' + dueDate + '</span>' +
        '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:var(--gold);" onclick="editTask(\'' + t._key + '\')">&#9998;</button>' +
        '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:#ef4444;" onclick="deleteTask(\'' + t._key + '\')">&#128465;</button>' +
      '</div></div>' +
      '<div class="post-title" id="task-title-' + t._key + '">' + t.title + '</div>' +
      '<div class="post-body" id="task-desc-' + t._key + '">' + t.desc + '</div>' +
      '<div id="task-edit-' + t._key + '" style="display:none;margin:15px 0;">' +
        '<input type="text" id="task-edit-title-' + t._key + '" value="' + escapeAttr(t.title) + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.95rem;font-family:inherit;background:var(--card-bg);color:var(--text);margin-bottom:8px;">' +
        '<textarea id="task-edit-desc-' + t._key + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:60px;">' + escapeAttr(t.desc) + '</textarea>' +
        '<div style="display:flex;gap:10px;margin-top:8px;">' +
          '<input type="date" id="task-edit-deadline-' + t._key + '" value="' + (t.deadline ? t.deadline.split('T')[0] : '') + '" style="flex:1;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;background:var(--card-bg);color:var(--text);">' +
          '<input type="time" id="task-edit-deadline-time-' + t._key + '" value="' + (t.deadline ? (t.deadline.split('T')[1] || '') : '') + '" style="flex:1;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;background:var(--card-bg);color:var(--text);">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="btn btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="saveTask(\'' + t._key + '\')">Save</button>' +
          '<button class="dash-logout" style="padding:6px 14px;font-size:0.8rem;" onclick="cancelEditTask(\'' + t._key + '\')">Cancel</button>' +
        '</div>' +
      '</div>' +
      '<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:10px;">Created: ' + (t.dateCreated || 'N/A') + ' | Submissions: ' + submitted + '/' + loggedUsersCount + '</p>' +
      (taskAnswers.length ?
        '<div style="margin-top:15px;"><strong style="font-size:0.9rem;">Mentee Submissions:</strong>' +
        taskAnswers.map(function(a) {
          return '<div class="comment-item" style="margin-top:8px;"><div class="comment-content">' +
            '<div class="comment-author">' + a.author + '</div>' +
            '<div class="comment-text">' + a.answer + '</div>' +
            '<div class="comment-time">' + a.time + '</div>' +
          '</div></div>';
        }).join('') + '</div>' :
        '<p style="font-size:0.85rem;color:var(--text-light);font-style:italic;margin-top:10px;">No submissions yet.</p>') +
    '</div>';
  }).join('');
}

function editTask(key) {
  document.getElementById('task-title-' + key).style.display = 'none';
  document.getElementById('task-desc-' + key).style.display = 'none';
  document.getElementById('task-edit-' + key).style.display = 'block';
}

function cancelEditTask(key) {
  var t = DB.tasks[key];
  if (!t) return;
  document.getElementById('task-edit-title-' + key).value = t.title;
  document.getElementById('task-edit-desc-' + key).value = t.desc;
  var parts = (t.deadline || '').split('T');
  document.getElementById('task-edit-deadline-' + key).value = parts[0] || '';
  document.getElementById('task-edit-deadline-time-' + key).value = parts[1] || '';
  document.getElementById('task-title-' + key).style.display = 'block';
  document.getElementById('task-desc-' + key).style.display = 'block';
  document.getElementById('task-edit-' + key).style.display = 'none';
}

function saveTask(key) {
  var newTitle = document.getElementById('task-edit-title-' + key).value.trim();
  var newDesc = document.getElementById('task-edit-desc-' + key).value.trim();
  var newDeadlineDate = document.getElementById('task-edit-deadline-' + key).value;
  var newDeadlineTime = document.getElementById('task-edit-deadline-time-' + key).value;
  if (!newTitle || !newDesc || !newDeadlineDate) return alert('All fields are required.');
  var newDeadline = newDeadlineDate + (newDeadlineTime ? 'T' + newDeadlineTime : '');
  var deadlineFormatted = new Date(newDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  db.ref('agapay/tasks/' + key).update({ title: newTitle, desc: newDesc, deadline: newDeadline, deadlineFormatted: deadlineFormatted });
}

function deleteTask(key) {
  if (!confirm('Delete this task and all submissions?')) return;
  var task = DB.tasks[key];
  var taskId = task ? task.id : null;
  db.ref('agapay/tasks/' + key).remove();
  if (taskId) {
    var answers = getData('taskAnswers');
    answers.filter(function(a) { return a.taskId === taskId; }).forEach(function(a) {
      db.ref('agapay/taskAnswers/' + a._key).remove();
    });
  }
}

// --- Sessions ---
function addSession() {
  if (!Security.canSubmit('addSession', 3000)) return alert('Please wait before adding another session.');
  var user = document.getElementById('sessionMentee').value;
  var title = Security.sanitizeInput(document.getElementById('sessionTitle').value, 200);
  var date = document.getElementById('sessionDate').value;
  var status = document.getElementById('sessionStatus').value;
  if (!user || !title || !date) return alert('Please fill in all fields.');
  var id = Date.now();
  db.ref('agapay/sessions/' + id).set({
    id: id, user: user, title: title, date: date, status: status,
    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  });
  document.getElementById('sessionTitle').value = '';
  document.getElementById('sessionDate').value = '';
  showSaved('sessionAdded');
}

function renderSessionsList() {
  var sessions = getData('sessions');
  var el = document.getElementById('sessionsList');
  var no = document.getElementById('noSessions');
  var menteesObj = getDataObj('mentees');
  var loggedUsersObj = getDataObj('loggedUsers');

  var nameLookup = {};
  Object.values(menteesObj).forEach(function(m) { nameLookup[m.user] = m.name; });
  Object.values(loggedUsersObj).forEach(function(u) { nameLookup[u.user] = u.name; });

  if (!sessions.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = sessions.map(function(s) {
    var name = nameLookup[s.user] || s.user;
    return '<div class="mentee-item">' +
      '<div class="mentee-info">' +
        '<div class="mentee-avatar">' + (s.status === 'done' ? '&#9989;' : '&#128197;') + '</div>' +
        '<div>' +
          '<div class="mentee-name">' + s.title + '</div>' +
          '<div class="mentee-email">' + name + ' &bull; ' + s.date + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
        '<span class="mentee-status ' + (s.status === 'done' ? 'status-active' : 'status-pending') + '">' + (s.status === 'done' ? 'Done' : 'Upcoming') + '</span>' +
        '<button class="dash-logout" style="padding:5px 10px;font-size:0.75rem;" onclick="toggleSession(\'' + s._key + '\')">' + (s.status === 'done' ? 'Undo' : 'Done') + '</button>' +
        '<button class="dash-logout" style="padding:5px 10px;font-size:0.75rem;border-color:#dc2626;color:#dc2626;" onclick="deleteSession(\'' + s._key + '\')">X</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleSession(key) {
  var s = DB.sessions[key];
  if (s) {
    db.ref('agapay/sessions/' + key + '/status').set(s.status === 'done' ? 'upcoming' : 'done');
  }
}

function deleteSession(key) {
  if (!confirm('Delete this session?')) return;
  db.ref('agapay/sessions/' + key).remove();
}

// --- Mentee List ---
function renderMenteeList() {
  var menteesObj = getDataObj('mentees');
  var loggedUsersObj = getDataObj('loggedUsers');

  var allMentees = {};
  Object.values(menteesObj).forEach(function(m) {
    allMentees[m.user] = { name: m.name, email: m.email || m.user + '@phinmaed.com', lastLogin: 'Not yet', status: 'registered', picture: m.picture || null };
  });
  Object.values(loggedUsersObj).forEach(function(u) {
    if (allMentees[u.user]) {
      allMentees[u.user].lastLogin = u.lastLogin || 'N/A';
      allMentees[u.user].status = 'active';
      if (u.picture) allMentees[u.user].picture = u.picture;
    } else {
      allMentees[u.user] = { name: u.name, email: u.email || u.user + '@phinmaed.com', lastLogin: u.lastLogin || 'N/A', status: 'active', picture: u.picture || null };
    }
  });

  var mentees = Object.values(allMentees);
  var el = document.getElementById('menteeList');

  el.innerHTML = mentees.length ? mentees.map(function(u) {
    var avatarContent = u.picture
      ? '<img src="' + u.picture + '" style="width:45px;height:45px;border-radius:50%;">'
      : u.name.split(' ').map(function(n) { return n[0]; }).join('');
    return '<div class="mentee-item">' +
      '<div class="mentee-info">' +
        '<div class="mentee-avatar">' + avatarContent + '</div>' +
        '<div>' +
          '<div class="mentee-name">' + u.name + '</div>' +
          '<div class="mentee-email">' + u.email + '</div>' +
          '<div style="font-size:0.7rem;color:var(--text-light);margin-top:2px;">Last login: ' + u.lastLogin + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="mentee-status ' + (u.status === 'active' ? 'status-active' : 'status-pending') + '">' + (u.status === 'active' ? 'Active' : 'Registered') + '</span>' +
    '</div>';
  }).join('') : '<p style="text-align:center;color:var(--text-light);padding:20px;">No mentees yet.</p>';

  document.getElementById('totalMentees').textContent = mentees.length;

  var sel = document.getElementById('sessionMentee');
  if (sel) {
    sel.innerHTML = mentees.map(function(m) { return '<option value="' + escapeAttr(m.name.toLowerCase().replace(/\s+/g, '')) + '">' + m.name + '</option>'; }).join('');
  }
}

// --- Feedback / Questions ---
function renderAllFeedback() {
  var allFb = getData('feedback');
  var el = document.getElementById('allFeedbackList');
  var no = document.getElementById('noFeedback');

  if (!allFb.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = allFb.map(function(f) {
    var isDeleted = f.deletedByMentee || f.deletedByAdmin;
    var borderStyle = isDeleted ? 'opacity:0.7;border-left:3px solid #ef4444;' : '';
    var deletedBadge = f.deletedByMentee ? '<span style="color:#ef4444;font-size:0.75rem;margin-left:8px;">Deleted by mentee</span>' :
                       f.deletedByAdmin ? '<span style="color:#ef4444;font-size:0.75rem;margin-left:8px;">Deleted by admin</span>' : '';
    var removedText = f.deletedByMentee ? ' &bull; Removed: ' + f.deletedAt : f.deletedByAdmin ? ' &bull; Removed: ' + f.deletedAt : '';

    var actionsHtml = '';
    if (!isDeleted) {
      actionsHtml = '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:var(--gold);" onclick="adminEditFeedback(\'' + f._key + '\')">&#9998;</button>' +
        '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:#ef4444;" onclick="adminDeleteFeedback(\'' + f._key + '\')">&#128465;</button>';
    }

    var replySection = '';
    if (f.reply) {
      replySection = '<div class="reply-content" id="admin-reply-' + f._key + '">' + f.reply + '</div>' +
        '<div id="admin-reply-edit-' + f._key + '" style="display:none;margin:10px 0;">' +
          '<textarea id="admin-reply-edit-input-' + f._key + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:60px;">' + escapeAttr(f.reply) + '</textarea>' +
          '<div style="display:flex;gap:8px;margin-top:8px;">' +
            '<button class="btn btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="saveAdminReply(\'' + f._key + '\')">Save</button>' +
            '<button class="dash-logout" style="padding:6px 14px;font-size:0.8rem;" onclick="cancelAdminReply(\'' + f._key + '\')">Cancel</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:6px;" id="admin-reply-actions-' + f._key + '">' +
          '<button style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:var(--gold);" onclick="editAdminReply(\'' + f._key + '\')">&#9998; Edit Reply</button>' +
          '<button style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:#ef4444;" onclick="deleteAdminReply(\'' + f._key + '\')">&#128465; Delete Reply</button>' +
        '</div>';
    } else if (isDeleted) {
      replySection = '<p style="font-size:0.85rem;color:var(--text-light);font-style:italic;">Question was deleted.</p>';
    } else {
      replySection = '<div class="feedback-reply">' +
        '<textarea id="reply-' + f._key + '" placeholder="Write your reply..."></textarea>' +
        '<button class="btn btn-primary" onclick="sendReply(\'' + f._key + '\')">Send Reply</button>' +
        '<div class="reply-saved" id="saved-' + f._key + '">Reply sent!</div>' +
      '</div>';
    }

    return '<div class="feedback-item" style="' + borderStyle + '">' +
      '<div class="feedback-header">' +
        '<span class="feedback-from">' + f.from + deletedBadge + '</span>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<span class="feedback-date">' + f.date + removedText + '</span>' +
          actionsHtml +
        '</div>' +
      '</div>' +
      '<div class="feedback-message" id="admin-fb-msg-' + f._key + '">' + f.message + '</div>' +
      '<div id="admin-fb-edit-' + f._key + '" style="display:none;margin:10px 0;">' +
        '<textarea id="admin-fb-edit-input-' + f._key + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:60px;">' + escapeAttr(f.message) + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="btn btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="saveAdminFeedback(\'' + f._key + '\')">Save</button>' +
          '<button class="dash-logout" style="padding:6px 14px;font-size:0.8rem;" onclick="cancelAdminFeedback(\'' + f._key + '\')">Cancel</button>' +
        '</div>' +
      '</div>' +
      replySection +
    '</div>';
  }).join('');

  document.getElementById('totalQuestions').textContent = allFb.filter(function(f) { return !f.reply && !f.deletedByMentee && !f.deletedByAdmin; }).length;
}

function adminEditFeedback(key) {
  document.getElementById('admin-fb-msg-' + key).style.display = 'none';
  document.getElementById('admin-fb-edit-' + key).style.display = 'block';
}

function cancelAdminFeedback(key) {
  var f = DB.feedback[key];
  if (!f) return;
  document.getElementById('admin-fb-edit-input-' + key).value = f.message;
  document.getElementById('admin-fb-msg-' + key).style.display = 'block';
  document.getElementById('admin-fb-edit-' + key).style.display = 'none';
}

function saveAdminFeedback(key) {
  var newMsg = document.getElementById('admin-fb-edit-input-' + key).value.trim();
  if (!newMsg) return alert('Message cannot be empty.');
  db.ref('agapay/feedback/' + key + '/message').set(newMsg);
}

function adminDeleteFeedback(key) {
  if (!confirm('Delete this question?')) return;
  db.ref('agapay/feedback/' + key).update({
    deletedByAdmin: true,
    deletedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  });
}

function sendReply(key) {
  if (!Security.canSubmit('sendReply', 3000)) return alert('Please wait before sending another reply.');
  var text = Security.sanitizeInput(document.getElementById('reply-' + key).value, 2000);
  if (!text) return;
  db.ref('agapay/feedback/' + key + '/reply').set(text);
}

function editAdminReply(key) {
  document.getElementById('admin-reply-' + key).style.display = 'none';
  document.getElementById('admin-reply-actions-' + key).style.display = 'none';
  document.getElementById('admin-reply-edit-' + key).style.display = 'block';
}

function cancelAdminReply(key) {
  var el = document.getElementById('admin-reply-' + key);
  document.getElementById('admin-reply-edit-' + key).style.display = 'none';
  if (el) el.style.display = 'block';
  var actions = document.getElementById('admin-reply-actions-' + key);
  if (actions) actions.style.display = 'flex';
}

function saveAdminReply(key) {
  var newReply = document.getElementById('admin-reply-edit-input-' + key).value.trim();
  if (!newReply) return alert('Reply cannot be empty.');
  db.ref('agapay/feedback/' + key + '/reply').set(newReply);
}

function deleteAdminReply(key) {
  if (!confirm('Delete this reply?')) return;
  db.ref('agapay/feedback/' + key + '/reply').set('');
}

// --- Settings ---
function updateAdminProfile() {
  if (!Security.canSubmit('updateAdminProfile', 3000)) return alert('Please wait before updating again.');
  var newUsername = Security.sanitizeInput(document.getElementById('adminUsername').value.trim().toLowerCase(), 30);
  var newName = Security.sanitizeInput(document.getElementById('adminName').value.trim(), 100);
  var newEmail = Security.sanitizeInput(document.getElementById('adminEmail').value.trim(), 100);

  if (!newUsername || !newName) return alert('Username and name are required.');
  if (!Security.isValidUsername(newUsername)) return alert('Username must be 3-30 characters, letters/numbers/underscores only.');
  if (newEmail && !Security.isValidEmail(newEmail)) return alert('Please enter a valid email address.');

  db.ref('agapay/admin').update({ user: newUsername, name: newName, email: newEmail });

  var session = JSON.parse(sessionStorage.getItem('agapayUser'));
  if (session) {
    session.name = newName;
    sessionStorage.setItem('agapayUser', JSON.stringify(session));
  }
  showSaved('profileUpdated');
}

function changePassword() {
  var c = document.getElementById('currentPass').value;
  var n = document.getElementById('newPass').value;
  var cf = document.getElementById('confirmPass').value;
  var a = DB.admin || { user: 'admin', password: 'agapayadmin' };
  if (c !== a.password) return alert('Current password incorrect.');
  if (n !== cf) return alert('Passwords do not match.');
  if (n.length < 6) return alert('Password must be at least 6 characters.');
  db.ref('agapay/admin/password').set(n);
  document.getElementById('currentPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
  showSaved('passUpdated');
}

function addMentee() {
  if (!Security.canSubmit('addMentee', 5000)) return alert('Please wait before adding another mentee.');
  var u = Security.sanitizeInput(document.getElementById('newMenteeUser').value.trim().toLowerCase(), 30);
  var n = Security.sanitizeInput(document.getElementById('newMenteeName').value.trim(), 100);
  var p = document.getElementById('newMenteePass').value;
  if (!u || !n || !p) return alert('Fill in all fields.');
  if (!Security.isValidUsername(u)) return alert('Username must be 3-30 characters, letters/numbers/underscores only.');
  if (p.length < 6) return alert('Password must be at least 6 characters.');
  var menteesObj = getDataObj('mentees');
  if (Object.values(menteesObj).find(function(m) { return m.user === u; })) return alert('Username exists.');
  db.ref('agapay/mentees/' + u).set({
    user: u, password: p, name: n, email: u + '@phinmaed.com'
  });
  document.getElementById('newMenteeUser').value = '';
  document.getElementById('newMenteeName').value = '';
  document.getElementById('newMenteePass').value = '';
  showSaved('menteeAdded');
}

// --- Admin Invites ---
function inviteAdmin() {
  if (!Security.canSubmit('inviteAdmin', 10000)) return alert('Please wait before sending another invitation.');
  var email = Security.sanitizeInput(document.getElementById('inviteEmail').value.trim(), 100);
  if (!email || !Security.isValidEmail(email)) return alert('Enter a valid email address.');

  var token = 'agapay_' + btoa(email + '_' + Date.now()).replace(/=/g, '');
  var baseUrl = window.location.origin + window.location.pathname.replace('login.html', '');
  var link = baseUrl + 'admin-register.html?token=' + token + '&email=' + encodeURIComponent(email);

  db.ref('agapay/adminInvites/' + token).set({
    email: email, token: token,
    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    status: 'pending'
  });

  document.getElementById('inviteEmail').value = '';
  document.getElementById('inviteLink').value = link;
  document.getElementById('inviteLinkBox').style.display = 'block';

  emailjs.send('service_ov5dper', 'template_jvvpnp5', {
    email: email, name: email.split('@')[0],
    invitation_link: link, from_name: 'Agapay Mentorship'
  }).then(function() {
    showSaved('inviteSent');
  }).catch(function(err) {
    console.error('Email send failed:', err);
    alert('Email sending failed. Link copied instead.');
    navigator.clipboard.writeText(link);
  });
}

function copyInviteLink() {
  var input = document.getElementById('inviteLink');
  input.select();
  document.execCommand('copy');
  alert('Link copied!');
}

function renderPendingInvites() {
  var invitesObj = getDataObj('adminInvites');
  var invites = Object.values(invitesObj);
  var el = document.getElementById('pendingInvites');
  if (!invites.length) { el.innerHTML = ''; return; }

  el.innerHTML = '<h4 style="margin-bottom:10px;">Pending Invitations</h4>' +
    invites.map(function(inv) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-alt);border-radius:8px;margin-bottom:8px;border:1px solid var(--gray-200);">' +
        '<div>' +
          '<div style="font-weight:600;font-size:0.9rem;">' + inv.email + '</div>' +
          '<div style="font-size:0.8rem;color:var(--text-light);">' + inv.date + ' &mdash; <span style="color:' + (inv.status === 'accepted' ? '#22c55e' : '#f59e0b') + ';">' + inv.status + '</span></div>' +
        '</div>' +
        (inv.status === 'pending' ? '<button style="background:none;border:none;cursor:pointer;font-size:0.85rem;color:#ef4444;" onclick="cancelInvite(\'' + inv.token + '\')">Cancel</button>' : '') +
      '</div>';
    }).join('');
}

function cancelInvite(token) {
  if (!confirm('Cancel this invitation?')) return;
  db.ref('agapay/adminInvites/' + token).remove();
}

function updateStats() {
  var feedback = getData('feedback');
  var posts = getData('posts');
  document.getElementById('totalPosts').textContent = posts.length;
  document.getElementById('totalQuestions').textContent = feedback.filter(function(f) { return !f.reply; }).length;
}

// ==========================================
// MENTEE FUNCTIONS
// ==========================================

function renderMenteePosts() {
  var posts = getData('posts');
  var el = document.getElementById('menteePostsList');
  var no = document.getElementById('noMenteePosts');
  var currentUser = JSON.parse(sessionStorage.getItem('agapayUser')) || {};

  if (!posts.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = posts.map(function(p) {
    var comments = p.comments ? objToArr(p.comments) : [];
    return '<div class="post-item">' +
      '<div class="post-header"><span class="post-date">' + p.date + '</span></div>' +
      '<span class="post-tag tag-' + p.tag + '">' + getTagIcon(p.tag) + ' ' + capitalize(p.tag) + '</span>' +
      '<div class="post-title">' + p.title + '</div>' +
      '<div class="post-body">' + p.body + '</div>' +
      '<div class="comments-section">' +
        '<div class="comments-header">&#128172; ' + comments.length + ' Comment' + (comments.length !== 1 ? 's' : '') + '</div>' +
        comments.map(function(c) {
          var editBtns = (c.user === currentUser.user && c.role !== 'admin')
            ? '<div style="display:flex;gap:5px;">' +
                '<button style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:var(--gold);" onclick="editComment(\'' + p._key + '\', \'' + c._key + '\')">&#9998;</button>' +
                '<button style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:#ef4444;" onclick="deleteComment(\'' + p._key + '\', \'' + c._key + '\')">&#128465;</button>' +
              '</div>' : '';

          return '<div class="comment-item"><div class="comment-content">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<div class="comment-author">' + c.author + (c.role === 'admin' ? ' <span style="color:var(--gold);font-size:0.75rem;">(Admin)</span>' : '') + '</div>' +
              editBtns +
            '</div>' +
            '<div class="comment-text" id="cmt-text-' + p._key + '-' + c._key + '">' + c.text + '</div>' +
            '<div id="cmt-edit-' + p._key + '-' + c._key + '" style="display:none;margin-top:5px;">' +
              '<input type="text" id="cmt-input-' + p._key + '-' + c._key + '" value="' + escapeAttr(c.text) + '" style="width:100%;padding:8px;border:1px solid var(--gray-200);border-radius:6px;font-size:0.85rem;background:var(--card-bg);color:var(--text);">' +
              '<div style="display:flex;gap:5px;margin-top:5px;">' +
                '<button style="padding:4px 10px;border-radius:6px;border:none;background:var(--gold);color:var(--navy);font-size:0.75rem;font-weight:600;cursor:pointer;" onclick="saveComment(\'' + p._key + '\', \'' + c._key + '\')">Save</button>' +
                '<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--gray-200);background:var(--card-bg);color:var(--text);font-size:0.75rem;cursor:pointer;" onclick="cancelEditComment(\'' + p._key + '\', \'' + c._key + '\')">Cancel</button>' +
              '</div>' +
            '</div>' +
            '<div class="comment-time">' + c.time + '</div>' +
          '</div></div>';
        }).join('') +
        '<div class="comment-form">' +
          '<input type="text" id="menteeComment-' + p._key + '" placeholder="Write a comment...">' +
          '<button class="btn btn-primary" onclick="addComment(\'' + p._key + '\', \'mentee\')">Comment</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function editComment(postKey, commentKey) {
  document.getElementById('cmt-text-' + postKey + '-' + commentKey).style.display = 'none';
  document.getElementById('cmt-edit-' + postKey + '-' + commentKey).style.display = 'block';
}

function cancelEditComment(postKey, commentKey) {
  var c = DB.posts[postKey] && DB.posts[postKey].comments ? DB.posts[postKey].comments[commentKey] : null;
  if (!c) return;
  document.getElementById('cmt-input-' + postKey + '-' + commentKey).value = c.text;
  document.getElementById('cmt-text-' + postKey + '-' + commentKey).style.display = 'block';
  document.getElementById('cmt-edit-' + postKey + '-' + commentKey).style.display = 'none';
}

function saveComment(postKey, commentKey) {
  var newText = document.getElementById('cmt-input-' + postKey + '-' + commentKey).value.trim();
  if (!newText) return;
  db.ref('agapay/posts/' + postKey + '/comments/' + commentKey + '/text').set(newText);
}

function deleteComment(postKey, commentKey) {
  if (!confirm('Delete this comment?')) return;
  db.ref('agapay/posts/' + postKey + '/comments/' + commentKey).remove();
}

// --- Mentee Tasks ---
function renderMenteeTasks() {
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  if (!user) return;
  var tasks = getData('tasks');
  var taskAnswersObj = getDataObj('taskAnswers');
  var answers = Object.values(taskAnswersObj);
  var el = document.getElementById('menteeTasksList');
  var no = document.getElementById('noMenteeTasks');

  if (!tasks.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = tasks.map(function(t) {
    var myAnswer = answers.find(function(a) { return a.taskId === t.id && a.user === user.user; });
    var isOverdue = new Date(t.deadline) < new Date();
    var dueDate = t.deadline ? new Date(t.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline';

    var answerSection = '';
    if (myAnswer) {
      answerSection = '<div class="reply-content" style="margin-top:15px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div style="flex:1;">' +
            '<strong>Your Answer:</strong>' +
            '<div id="task-ans-text-' + t.id + '">' + myAnswer.answer + '</div>' +
            '<div id="task-ans-edit-' + t.id + '" style="display:none;margin-top:8px;">' +
              '<textarea id="task-ans-input-' + t.id + '" style="width:100%;padding:10px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:80px;">' + escapeAttr(myAnswer.answer) + '</textarea>' +
              '<div style="display:flex;gap:8px;margin-top:8px;">' +
                '<button class="btn btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="saveTaskAnswer(\'' + t.id + '\', \'' + myAnswer._key + '\')">Save</button>' +
                '<button class="dash-logout" style="padding:6px 14px;font-size:0.8rem;" onclick="cancelEditTaskAnswer(\'' + t.id + '\', \'' + myAnswer._key + '\')">Cancel</button>' +
              '</div>' +
            '</div>' +
            '<div class="comment-time" style="margin-top:5px;">Submitted: ' + myAnswer.time + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:5px;margin-left:10px;">' +
            '<button style="background:none;border:none;cursor:pointer;font-size:0.9rem;color:var(--gold);" onclick="editTaskAnswer(' + t.id + ')">&#9998;</button>' +
            '<button style="background:none;border:none;cursor:pointer;font-size:0.9rem;color:#ef4444;" onclick="deleteTaskAnswer(\'' + myAnswer._key + '\')">&#128465;</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    } else {
      answerSection = '<div class="feedback-reply" style="margin-top:15px;">' +
        '<textarea id="taskAnswer-' + t.id + '" placeholder="Write your answer here..."></textarea>' +
        '<button class="btn btn-primary" onclick="submitTaskAnswer(' + t.id + ')">Submit Answer</button>' +
      '</div>';
    }

    return '<div class="post-item">' +
      '<div class="post-header">' +
        '<span class="post-date" style="color:' + (isOverdue && !myAnswer ? '#ef4444' : 'var(--text-light)') + '">Due: ' + dueDate + (isOverdue && !myAnswer ? ' (Overdue)' : '') + '</span>' +
      '</div>' +
      '<div class="post-title">' + t.title + '</div>' +
      '<div class="post-body">' + t.desc + '</div>' +
      answerSection +
    '</div>';
  }).join('');
}

function editTaskAnswer(taskId) {
  document.getElementById('task-ans-text-' + taskId).style.display = 'none';
  document.getElementById('task-ans-edit-' + taskId).style.display = 'block';
}

function cancelEditTaskAnswer(taskId, answerKey) {
  var a = DB.taskAnswers[answerKey];
  if (!a) return;
  document.getElementById('task-ans-input-' + taskId).value = a.answer;
  document.getElementById('task-ans-text-' + taskId).style.display = 'block';
  document.getElementById('task-ans-edit-' + taskId).style.display = 'none';
}

function saveTaskAnswer(taskId, answerKey) {
  var newAnswer = document.getElementById('task-ans-input-' + taskId).value.trim();
  if (!newAnswer) return alert('Answer cannot be empty.');
  var time = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (edited)';
  db.ref('agapay/taskAnswers/' + answerKey).update({ answer: newAnswer, time: time });
}

function deleteTaskAnswer(answerKey) {
  if (!confirm('Delete your answer?')) return;
  db.ref('agapay/taskAnswers/' + answerKey).remove();
}

function submitTaskAnswer(taskId) {
  if (!Security.canSubmit('submitTaskAnswer', 5000)) return alert('Please wait before submitting again.');
  var textarea = document.getElementById('taskAnswer-' + taskId);
  var answer = Security.sanitizeInput(textarea.value, 5000);
  if (!answer) return alert('Please write your answer.');
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  var id = Date.now();
  db.ref('agapay/taskAnswers/' + id).set({
    id: id, taskId: taskId,
    user: user.user, author: Security.escapeHtml(user.name), answer: answer,
    time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  });
  textarea.value = '';
}

// --- Mentee Feedback ---
function submitFeedback() {
  if (!Security.canSubmit('submitFeedback', 5000)) return alert('Please wait before submitting again.');
  var text = Security.sanitizeInput(document.getElementById('menteeFeedback').value, 2000);
  if (!text) return;
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  var id = Date.now();
  db.ref('agapay/feedback/' + id).set({
    id: id, from: Security.escapeHtml(user.name), user: user.user, message: text,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    reply: null
  });
  document.getElementById('menteeFeedback').value = '';
  showSaved('feedbackSent');
}

function renderMyFeedback() {
  var user = JSON.parse(sessionStorage.getItem('agapayUser'));
  if (!user) return;
  var allFb = getData('feedback');
  var fb = allFb.filter(function(f) { return f.user === user.user && !f.deletedByMentee && !f.deletedByAdmin; });
  var el = document.getElementById('myFeedbackList');
  var no = document.getElementById('noMyFeedback');

  if (!fb.length) { el.innerHTML = ''; no.style.display = 'block'; return; }
  no.style.display = 'none';

  el.innerHTML = fb.map(function(f) {
    var editBtns = !f.reply
      ? '<button class="dash-logout" style="padding:4px 10px;font-size:0.75rem;" onclick="editFeedback(\'' + f._key + '\')">&#9998; Edit</button>' +
        '<button class="dash-logout" style="padding:4px 10px;font-size:0.75rem;border-color:#dc2626;color:#dc2626;" onclick="deleteFeedback(\'' + f._key + '\')">&#128465;</button>'
      : '';

    var replySection = f.reply
      ? '<div class="reply-content">' + f.reply + '</div>'
      : '<p style="font-size:0.85rem;color:var(--text-light);font-style:italic;">Waiting for reply...</p>';

    return '<div class="feedback-item" id="fb-item-' + f._key + '">' +
      '<div class="feedback-header">' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<span class="feedback-date">' + f.date + '</span>' +
          editBtns +
        '</div>' +
      '</div>' +
      '<div class="feedback-message" id="fb-msg-' + f._key + '">' + f.message + '</div>' +
      '<div id="fb-edit-' + f._key + '" style="display:none;">' +
        '<textarea id="fb-edit-input-' + f._key + '" style="width:100%;padding:12px;border:1px solid var(--gray-200);border-radius:8px;font-size:0.9rem;font-family:inherit;background:var(--card-bg);color:var(--text);resize:vertical;min-height:80px;">' + escapeAttr(f.message) + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="btn btn-primary" style="padding:8px 16px;font-size:0.8rem;" onclick="saveFeedback(\'' + f._key + '\')">Save</button>' +
          '<button class="dash-logout" style="padding:8px 16px;font-size:0.8rem;" onclick="cancelEditFeedback(\'' + f._key + '\')">Cancel</button>' +
        '</div>' +
      '</div>' +
      replySection +
    '</div>';
  }).join('');
}

function editFeedback(key) {
  document.getElementById('fb-msg-' + key).style.display = 'none';
  document.getElementById('fb-edit-' + key).style.display = 'block';
}

function cancelEditFeedback(key) {
  var f = DB.feedback[key];
  if (!f) return;
  document.getElementById('fb-edit-input-' + key).value = f.message;
  document.getElementById('fb-msg-' + key).style.display = 'block';
  document.getElementById('fb-edit-' + key).style.display = 'none';
}

function saveFeedback(key) {
  var newMsg = document.getElementById('fb-edit-input-' + key).value.trim();
  if (!newMsg) return alert('Message cannot be empty.');
  db.ref('agapay/feedback/' + key + '/message').set(newMsg);
}

function deleteFeedback(key) {
  if (!confirm('Delete this question?')) return;
  db.ref('agapay/feedback/' + key).update({
    deletedByMentee: true,
    deletedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  });
}

// --- Mentee Stats ---
function updateMenteeStats(user) {
  var sessions = getData('sessions').filter(function(s) { return s.user === user; });
  var done = sessions.filter(function(s) { return s.status === 'done'; }).length;
  var upcoming = sessions.filter(function(s) { return s.status === 'upcoming'; }).length;
  var total = sessions.length;
  var progress = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statUpcoming').textContent = upcoming;
  document.getElementById('statProgress').textContent = progress + '%';
}

// ==========================================
// HELPERS
// ==========================================

function showSaved(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 3000);
}

function getTagIcon(tag) {
  if (tag === 'announcement') return '&#128227;';
  if (tag === 'important') return '&#10071;';
  return '&#9989;';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== STARTUP =====
setupListeners();
initDefaults();

if (typeof emailjs !== 'undefined') {
  emailjs.init('ONzjMfvUFCoPoF5Ah');
}

// Session restore
(function() {
  var session = sessionStorage.getItem('agapayUser');
  if (session) {
    var u = JSON.parse(session);
    if (u.role === 'mentee') showMenteeDashboard(u.name, u.picture);
    else if (u.role === 'admin') showAdminDashboard();
  }
})();
