/* =========================================================
   MÁY TÍNH BỎ TÚI — LOGIC XỬ LÝ (Vanilla JS)
   =========================================================
   Nguyên lý hoạt động (mô hình trạng thái - state machine):

   - currentValue : chuỗi số đang hiển thị ở dòng kết quả
                    (số đang gõ dở, hoặc kết quả vừa tính).
   - previousValue: số đã "chốt" trước đó (kiểu number),
                    dùng làm toán hạng thứ nhất.
   - operator     : toán tử đang chờ thực hiện ('+','-','*','/').
   - overwrite    : true  = lần bấm số tiếp theo sẽ GHI ĐÈ
                            currentValue (bắt đầu số mới),
                    false = lần bấm số tiếp theo sẽ NỐI THÊM
                            vào currentValue.
   - isError      : true khi đang hiển thị thông báo lỗi
                    (ví dụ chia cho 0).
   ========================================================= */

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const keypad = document.getElementById('keypad');

// Ký hiệu hiển thị đẹp cho từng toán tử (khác với ký hiệu dùng để tính toán)
const OPERATOR_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

// Giới hạn số ký tự tối đa cho một số để tránh tràn màn hình
const MAX_DIGITS = 15;

// Trạng thái ban đầu của máy tính
let state = {
  currentValue: '0',
  previousValue: null,
  operator: null,
  overwrite: true,
  isError: false,
};

/* ---------------------------------------------------------
   HÀM TIỆN ÍCH
   --------------------------------------------------------- */

// Làm tròn kết quả để tránh sai số dấu phẩy động của JavaScript
// (ví dụ 0.1 + 0.2 sẽ ra 0.30000000000000004 nếu không xử lý)
function roundResult(number) {
  return Math.round((number + Number.EPSILON) * 1e10) / 1e10;
}

// Chuyển number -> chuỗi hiển thị, bỏ số 0 dư thừa không cần thiết
function formatDisplay(number) {
  if (typeof number !== 'number' || Number.isNaN(number)) return '0';
  return number.toString();
}

// Tự thu nhỏ cỡ chữ khi số quá dài để không bị tràn khỏi màn hình
function adjustFontSize() {
  resultEl.classList.toggle('long', resultEl.textContent.length > 9);
}

// Hiển thị thông báo lỗi lên màn hình (vd: chia cho 0)
function showError(message) {
  state.isError = true;
  state.currentValue = '0';
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true;

  resultEl.textContent = message;
  resultEl.classList.add('error');
  expressionEl.textContent = '';
}

// Vẽ lại toàn bộ màn hình dựa theo state hiện tại
function render() {
  resultEl.classList.remove('error');
  resultEl.textContent = state.currentValue;

  // Dòng biểu thức nhỏ phía trên: hiện "số_trước toán_tử" khi đang chờ nhập số 2
  expressionEl.textContent =
    state.operator && state.previousValue !== null
      ? `${formatDisplay(state.previousValue)} ${OPERATOR_SYMBOLS[state.operator]}`
      : '';

  adjustFontSize();
}

/* ---------------------------------------------------------
   HÀM TÍNH TOÁN CHÍNH
   Trả về number nếu tính được, trả về null nếu có lỗi
   (lỗi đã được hiển thị ngay bên trong hàm này).
   --------------------------------------------------------- */
function compute(a, b, operator) {
  switch (operator) {
    case '+':
      return roundResult(a + b);
    case '-':
      return roundResult(a - b);
    case '*':
      return roundResult(a * b);
    case '/':
      // XỬ LÝ NGOẠI LỆ: chia cho 0
      if (b === 0) {
        showError('Không thể chia cho 0');
        return null;
      }
      return roundResult(a / b);
    default:
      return null;
  }
}

/* ---------------------------------------------------------
   CÁC HÀM XỬ LÝ TỪNG LOẠI PHÍM BẤM
   --------------------------------------------------------- */

// Bấm một chữ số (0-9)
function inputDigit(digit) {
  if (state.isError) resetAll();

  if (state.overwrite) {
    // Bắt đầu nhập số mới, ghi đè số cũ (số 0 dư thừa không được giữ lại)
    state.currentValue = digit === '0' ? '0' : digit;
    state.overwrite = false;
  } else if (state.currentValue.replace('-', '').replace('.', '').length < MAX_DIGITS) {
    // XỬ LÝ NGOẠI LỆ: tránh số "0" dư thừa ở đầu, ví dụ gõ 0 rồi 5 -> "5" chứ không phải "05"
    state.currentValue = state.currentValue === '0' ? digit : state.currentValue + digit;
  }

  render();
}

// Bấm dấu chấm thập phân
function inputDecimal() {
  if (state.isError) resetAll();

  if (state.overwrite) {
    // Bắt đầu số mới dạng "0."
    state.currentValue = '0.';
    state.overwrite = false;
  } else if (!state.currentValue.includes('.')) {
    // XỬ LÝ NGOẠI LỆ: chỉ cho phép tối đa 1 dấu "." trong một số
    state.currentValue += '.';
  }

  render();
}

// Bấm một toán tử (+, -, *, /)
function chooseOperator(operator) {
  if (state.isError) resetAll();

  if (state.operator && !state.overwrite) {
    // Người dùng đã nhập xong số thứ 2 rồi bấm tiếp toán tử khác
    // -> tính luôn kết quả tạm thời để hỗ trợ phép tính nối tiếp (5 + 3 - 2 ...)
    const result = compute(state.previousValue, parseFloat(state.currentValue), state.operator);
    if (result === null) return; // đã có lỗi (vd chia 0), dừng lại
    state.previousValue = result;
    state.currentValue = formatDisplay(result);
  } else {
    // Chưa có số thứ 2 (mới nhập xong số đầu, hoặc vừa bấm "=")
    state.previousValue = parseFloat(state.currentValue);
  }

  // XỬ LÝ NGOẠI LỆ: bấm toán tử nhiều lần liên tiếp (vd "+" rồi "-")
  // -> chỉ cập nhật toán tử mới nhất, KHÔNG tính toán gì thêm
  state.operator = operator;
  state.overwrite = true;

  render();
}

// Bấm dấu "="
function handleEquals() {
  if (state.isError) return;

  // XỬ LÝ NGOẠI LỆ: bấm "=" khi chưa chọn toán tử hoặc chưa có số đầu -> bỏ qua
  if (state.operator === null || state.previousValue === null) return;

  const a = state.previousValue;
  const b = parseFloat(state.currentValue);
  const operator = state.operator;
  const result = compute(a, b, operator);
  if (result === null) return; // lỗi đã được showError() xử lý

  // Hiển thị lại đầy đủ phép tính vừa thực hiện ở dòng biểu thức
  expressionEl.textContent = `${formatDisplay(a)} ${OPERATOR_SYMBOLS[operator]} ${formatDisplay(b)} =`;

  state.currentValue = formatDisplay(result);
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true; // bấm số tiếp theo sẽ bắt đầu phép tính mới

  resultEl.classList.remove('error');
  resultEl.textContent = state.currentValue;
  adjustFontSize();
}

// Bấm "DEL" — xóa từng ký tự cuối của số đang nhập
function deleteLast() {
  if (state.isError) {
    resetAll();
    return;
  }

  if (state.overwrite) return; // không có gì để xóa (đang hiển thị số đã chốt)

  state.currentValue = state.currentValue.slice(0, -1);
  if (state.currentValue === '' || state.currentValue === '-') {
    state.currentValue = '0';
    state.overwrite = true;
  }

  render();
}

// Bấm "C" — xóa toàn bộ, đưa máy tính về trạng thái ban đầu
function clearAll() {
  resetAll();
  render();
}

function resetAll() {
  state = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    overwrite: true,
    isError: false,
  };
}

/* ---------------------------------------------------------
   GẮN SỰ KIỆN CLICK (dùng event delegation trên cả bàn phím)
   --------------------------------------------------------- */
keypad.addEventListener('click', (event) => {
  const button = event.target.closest('.key');
  if (!button) return;

  const { action, value } = button.dataset;

  switch (action) {
    case 'number':
      inputDigit(value);
      break;
    case 'decimal':
      inputDecimal();
      break;
    case 'operator':
      chooseOperator(value);
      break;
    case 'equals':
      handleEquals();
      break;
    case 'delete':
      deleteLast();
      break;
    case 'clear':
      clearAll();
      break;
  }
});

/* ---------------------------------------------------------
   HỖ TRỢ GÕ BẰNG BÀN PHÍM VẬT LÝ (tiện ích thêm)
   --------------------------------------------------------- */
window.addEventListener('keydown', (event) => {
  const { key } = event;

  if (/^[0-9]$/.test(key)) {
    inputDigit(key);
    flashKey(`.key-number[data-value="${key}"]`);
  } else if (key === '.') {
    inputDecimal();
    flashKey('.key-number[data-action="decimal"]');
  } else if (['+', '-', '*', '/'].includes(key)) {
    chooseOperator(key);
    flashKey(`.key-operator[data-value="${key}"]`);
  } else if (key === 'Enter' || key === '=') {
    event.preventDefault();
    handleEquals();
    flashKey('.key-equals');
  } else if (key === 'Backspace') {
    deleteLast();
    flashKey('[data-action="delete"]');
  } else if (key === 'Escape') {
    clearAll();
    flashKey('[data-action="clear"]');
  }
});

// Hiệu ứng "nhấn" nút tương ứng khi thao tác bằng bàn phím,
// giúp trải nghiệm nhất quán dù dùng chuột hay bàn phím
function flashKey(selector) {
  const button = keypad.querySelector(selector);
  if (!button) return;
  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 120);
}

// Vẽ màn hình lần đầu khi trang tải xong
render();