/**
 * YakMarket.tj - Phone Authentication Stub
 * Заглушка для будущей реализации SMS-авторизации через Strapi.
 */

const YakPhoneAuth = {
    /**
     * Отправить код на номер телефона
     */
    async sendCode(phoneNumber) {
        if (!window.YakAuth) return;

        try {
            console.log('YakPhoneAuth: Sending code to', phoneNumber);
            const result = await window.YakAuth.requestPhoneCode(phoneNumber);

            if (result.status === 'success') {
                YakToast.success('Код отправлен на ваш номер (заглушка: 123456)');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Phone Auth Error:', error);
            YakToast.error('Ошибка при отправке кода');
            return false;
        }
    },

    /**
     * Проверить код
     */
    async verifyCode(phoneNumber, code) {
        if (!window.YakAuth) return;

        try {
            console.log('YakPhoneAuth: Verifying code', code);
            const result = await window.YakAuth.verifyPhoneCode(phoneNumber, code);

            if (result.status === 'success') {
                YakToast.success('Номер успешно подтвержден!');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Phone Auth Verification Error:', error);
            YakToast.error('Неверный код');
            return false;
        }
    }
};

window.YakPhoneAuth = YakPhoneAuth;