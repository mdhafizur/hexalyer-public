import Cookies from 'js-cookie';

export const areCookiesValid = (): boolean => {
  const accessToken = Cookies.get('accessToken');
  const refreshToken = Cookies.get('refreshToken');

  // Add additional validation logic if necessary
  return !!accessToken && !!refreshToken; // Returns true if both tokens exist
};
