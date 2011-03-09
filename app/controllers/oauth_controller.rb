# coding: UTF-8

require 'oauth/controllers/provider_controller'

class OauthController < ApplicationController

  include OAuth::Controllers::ProviderController

  skip_before_filter :login_required, :only => :authorize

  def authorize
    if params[:oauth_token]
      unless @token = ::RequestToken.find_by_token(params[:oauth_token])
        render :action => "authorize_failure" and return
      end
      unless @token.invalidated?
        if logged_in?
          @token.authorize!(current_user)
        else
          @token.authorize!(@token.client_application.user)
        end
        @redirect_url = URI.parse(@token.oob? ? @token.client_application.callback_url || "http://cartodb.com" : @token.callback_url)

        unless @redirect_url.to_s.blank?
          @redirect_url.query = @redirect_url.query.blank? ?
                                "oauth_token=#{@token.token}&oauth_verifier=#{@token.verifier}" :
                                @redirect_url.query + "&oauth_token=#{@token.token}&oauth_verifier=#{@token.verifier}"
          redirect_to @redirect_url.to_s
        else
          render :action => "authorize_success"
        end
      else
        @token.invalidate!
        render :action => "authorize_failure"
      end
    elsif ["code","token"].include?(params[:response_type]) # pick flow
      send "oauth2_authorize_#{params[:response_type]}"
    end
  end

end