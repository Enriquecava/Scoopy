class UserSerializer
  def self.render(user)
    {
      id: user.id,
      email: user.email
    }
  end
end
