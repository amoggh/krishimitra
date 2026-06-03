from fastapi import APIRouter

from app.models.schemas import OtpRequest, OtpVerify, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request")
def request_otp(body: OtpRequest) -> dict[str, str]:
    return {"message": f"OTP sent to {body.phone}"}


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(body: OtpVerify) -> TokenResponse:
    return TokenResponse(access_token="dev-jwt-token", farmer_id="farmer-1")
